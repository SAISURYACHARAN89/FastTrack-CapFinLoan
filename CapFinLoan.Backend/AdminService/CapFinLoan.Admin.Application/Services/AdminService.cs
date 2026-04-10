using CapFinLoan.Admin.Application.DTOs;
using CapFinLoan.Admin.Application.Exceptions;
using CapFinLoan.Admin.Application.Events;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace CapFinLoan.Admin.Application.Services;

public sealed class AdminService
{
    private static readonly HashSet<string> ValidDecisions = new(StringComparer.OrdinalIgnoreCase)
    {
        "APPROVED",
        "REJECTED",
        "UNDER_REVIEW"
    };

    private static readonly HashSet<string> FinalDecisions = new(StringComparer.OrdinalIgnoreCase)
    {
        "APPROVED",
        "REJECTED"
    };

    private readonly IAdminDecisionRepository _decisions;
    private readonly IAdminHistoryRepository _history;
    private readonly IApplicationQueueReader _queue;
    private readonly IAdminEventPublisher _eventPublisher;
    private readonly IApplicantDecisionEmailSender _emailSender;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        IAdminDecisionRepository decisions,
        IAdminHistoryRepository history,
        IApplicationQueueReader queue,
        IAdminEventPublisher eventPublisher,
        IApplicantDecisionEmailSender emailSender,
        ILogger<AdminService> logger)
    {
        _decisions = decisions;
        _history = history;
        _queue = queue;
        _eventPublisher = eventPublisher;
        _emailSender = emailSender;
        _logger = logger;
    }

    /// <summary>Get queue of all applications from ApplicationService.</summary>
    public async Task<IReadOnlyList<ApplicationQueueDto>> GetQueueAsync(
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var queue = await _queue.GetQueueAsync(bearerToken, cancellationToken);

        return queue.Select(x => new ApplicationQueueDto
        {
            Id = x.Id,
            UserId = x.UserId,
            Amount = x.Amount,
            TenureMonths = x.TenureMonths,
            Status = x.Status,
            CreatedAt = x.CreatedAtUtc,
            DocumentCount = x.DocumentCount
        }).ToList();
    }

    /// <summary>
    /// Makes a decision (APPROVED, REJECTED, UNDER_REVIEW).
    /// 1. Fetches actual current status from ApplicationService (fixes I5).
    /// 2. Saves AdminDecision + history locally.
    /// 3. Syncs the new status back to ApplicationService (fixes C2).
    /// </summary>
    public async Task<AdminDecisionDto?> MakeDecisionAsync(
        int applicationId,
        int adminUserId,
        MakeDecisionRequestDto request,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Decision))
            throw new AdminValidationException("Decision is required.");

        var normalizedDecision = request.Decision.Trim().ToUpperInvariant();
        if (!ValidDecisions.Contains(normalizedDecision))
            throw new AdminValidationException($"Invalid decision. Allowed: {string.Join(", ", ValidDecisions)}");

        // I5: Fetch actual current status instead of hardcoding "SUBMITTED"
        var currentStatus = await _queue.GetApplicationStatusAsync(applicationId, bearerToken, cancellationToken)
                            ?? "SUBMITTED";

        var decision = new AdminDecision
        {
            ApplicationId = applicationId,
            Decision = normalizedDecision,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim(),
            ApprovedAmount = request.ApprovedAmount,
            TenureMonths = request.TenureMonths,
            InterestRate = request.InterestRate,
            CreatedBy = adminUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _decisions.AddAsync(decision, cancellationToken);

        // Record status history transition locally
        if (!normalizedDecision.Equals(currentStatus, StringComparison.OrdinalIgnoreCase))
        {
            var history = new ApplicationStatusHistory
            {
                ApplicationId = applicationId,
                OldStatus = currentStatus,
                NewStatus = normalizedDecision,
                Remarks = decision.Remarks,
                ChangedBy = adminUserId,
                ChangedAtUtc = DateTime.UtcNow
            };

            await _history.AddAsync(history, cancellationToken);
        }

        await _decisions.SaveChangesAsync(cancellationToken);

        // C2: Sync status back to ApplicationService
        await _queue.UpdateApplicationStatusAsync(applicationId, normalizedDecision, decision.Remarks, bearerToken, cancellationToken);

        if (FinalDecisions.Contains(normalizedDecision))
        {
            var decisionEvent = new AdminDecisionMadeEvent
            {
                ApplicationId = applicationId,
                AdminUserId = adminUserId,
                Decision = normalizedDecision,
                Remarks = decision.Remarks,
                ApprovedAmount = decision.ApprovedAmount,
                TenureMonths = decision.TenureMonths,
                InterestRate = decision.InterestRate
            };

            await _eventPublisher.PublishDecisionMadeAsync(decisionEvent, cancellationToken);

            await TryNotifyApplicantByEmailAsync(
                applicationId,
                normalizedDecision,
                decision.Remarks,
                bearerToken,
                cancellationToken);
        }

        return MapDecisionDto(decision);
    }

    /// <summary>Get the latest admin decision for an application.</summary>
    public async Task<AdminDecisionDto?> GetDecisionAsync(
        int applicationId,
        CancellationToken cancellationToken = default)
    {
        var decision = await _decisions.GetLatestByApplicationIdAsync(applicationId, cancellationToken);
        return decision == null ? null : MapDecisionDto(decision);
    }

    /// <summary>Get status history timeline for an application.</summary>
    public async Task<IReadOnlyList<ApplicationStatusHistoryDto>> GetHistoryAsync(
        int applicationId,
        CancellationToken cancellationToken = default)
    {
        var entries = await _history.GetByApplicationIdAsync(applicationId, cancellationToken);

        return entries.Select(x => new ApplicationStatusHistoryDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            OldStatus = x.OldStatus,
            NewStatus = x.NewStatus,
            Remarks = x.Remarks,
            ChangedBy = x.ChangedBy,
            ChangedAtUtc = x.ChangedAtUtc
        }).ToList();
    }

    /// <summary>
    /// Verify a document by calling DocumentService via HTTP (fixes I2 stub).
    /// </summary>
    public async Task<bool> VerifyDocumentAsync(
        int documentId,
        int adminUserId,
        VerifyDocumentRequestDto request,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
            throw new AdminValidationException("Document status is required.");

        var normalizedStatus = request.Status.Trim().ToUpperInvariant();
        if (normalizedStatus is not ("VERIFIED" or "REJECTED"))
            throw new AdminValidationException("Document status must be VERIFIED or REJECTED.");

        // I2: Actually call DocumentService to update status
        var success = await _queue.UpdateDocumentStatusAsync(documentId, normalizedStatus, bearerToken, cancellationToken);
        return success;
    }

    /// <summary>
    /// Generate a summary report of all applications.
    /// Fixes I3: now reads actual data from the AdminDecisions table.
    /// </summary>
    public async Task<AdminReportSummaryDto> GetReportSummaryAsync(
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var queue = await _queue.GetQueueAsync(bearerToken, cancellationToken);

        // I3: Read actual decisions from our local DB (no longer an empty list)
        var allDecisions = await _decisions.GetAllAsync(cancellationToken);

        // Build sets of applicationIds per final decision (keep latest decision per application)
        var latestDecisionPerApp = allDecisions
            .GroupBy(d => d.ApplicationId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(d => d.CreatedAtUtc).First().Decision);

        var approvedIds = latestDecisionPerApp.Where(kv => kv.Value.Equals("APPROVED", StringComparison.OrdinalIgnoreCase)).Select(kv => kv.Key).ToHashSet();
        var rejectedIds = latestDecisionPerApp.Where(kv => kv.Value.Equals("REJECTED", StringComparison.OrdinalIgnoreCase)).Select(kv => kv.Key).ToHashSet();
        var underReviewIds = latestDecisionPerApp.Where(kv => kv.Value.Equals("UNDER_REVIEW", StringComparison.OrdinalIgnoreCase)).Select(kv => kv.Key).ToHashSet();

        var pendingCount = queue.Count(x => x.Status.Equals("PENDING", StringComparison.OrdinalIgnoreCase));
        var submittedCount = queue.Count(x => x.Status.Equals("SUBMITTED", StringComparison.OrdinalIgnoreCase));
        var totalRequestedAmount = queue.Sum(x => x.Amount);

        var approvedTotalAmount = queue
            .Where(x => approvedIds.Contains(x.Id))
            .Sum(x => x.Amount);

        var totalApplications = queue.Count;
        var approvedCount = approvedIds.Count;
        var rejectedCount = rejectedIds.Count;
        var approvalRatePercent = totalApplications == 0 ? 0m : (approvedCount * 100m) / totalApplications;
        var rejectionRatePercent = totalApplications == 0 ? 0m : (rejectedCount * 100m) / totalApplications;
        var averageRequestedAmount = totalApplications == 0 ? 0m : totalRequestedAmount / totalApplications;
        var averageApprovedAmount = approvedCount == 0 ? 0m : approvedTotalAmount / approvedCount;

        return new AdminReportSummaryDto
        {
            TotalApplications = totalApplications,
            ApprovedCount = approvedCount,
            RejectedCount = rejectedCount,
            UnderReviewCount = underReviewIds.Count,
            PendingCount = pendingCount + submittedCount,
            TotalRequestedAmount = totalRequestedAmount,
            ApprovedTotalAmount = approvedTotalAmount,
            AverageRequestedAmount = averageRequestedAmount,
            AverageApprovedAmount = averageApprovedAmount,
            ApprovalRatePercent = Math.Round(approvalRatePercent, 2),
            RejectionRatePercent = Math.Round(rejectionRatePercent, 2),
            GeneratedAtUtc = DateTime.UtcNow
        };
    }

    private async Task TryNotifyApplicantByEmailAsync(
        int applicationId,
        string decision,
        string? remarks,
        string? bearerToken,
        CancellationToken cancellationToken)
    {
        try
        {
            var application = await _queue.GetApplicationAsync(applicationId, bearerToken, cancellationToken);
            if (application == null)
            {
                _logger.LogWarning(
                    "Skipping applicant decision email because application {ApplicationId} was not found via ApplicationService.",
                    applicationId);
                return;
            }

            var applicant = await _queue.GetApplicantContactAsync(application.UserId, bearerToken, cancellationToken);
            if (applicant == null || string.IsNullOrWhiteSpace(applicant.Email))
            {
                _logger.LogWarning(
                    "Skipping applicant decision email for application {ApplicationId}. Applicant contact missing for user {UserId}.",
                    applicationId,
                    application.UserId);
                return;
            }

            await _emailSender.SendDecisionEmailAsync(
                applicant.Email,
                applicant.Name,
                applicationId,
                decision,
                remarks,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to send applicant decision email for application {ApplicationId}.",
                applicationId);
        }
    }

    private static AdminDecisionDto MapDecisionDto(AdminDecision d) => new()
    {
        Id = d.Id,
        ApplicationId = d.ApplicationId,
        Decision = d.Decision,
        Remarks = d.Remarks,
        ApprovedAmount = d.ApprovedAmount,
        TenureMonths = d.TenureMonths,
        InterestRate = d.InterestRate,
        CreatedAt = d.CreatedAtUtc,
        CreatedBy = d.CreatedBy,
        CreatedAtUtc = d.CreatedAtUtc
    };
}
