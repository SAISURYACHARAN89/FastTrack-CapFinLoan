using CapFinLoan.Admin.Application.DTOs;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;

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

    public AdminService(
        IAdminDecisionRepository decisions,
        IAdminHistoryRepository history,
        IApplicationQueueReader queue)
    {
        _decisions = decisions;
        _history = history;
        _queue = queue;
    }

    /// <summary>
    /// Get queue of all applications (PENDING, SUBMITTED, UNDER_REVIEW, etc.)
    /// </summary>
    public async Task<IReadOnlyList<ApplicationQueueDto>> GetQueueAsync(string? bearerToken = null, CancellationToken cancellationToken = default)
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
    /// Make a decision (APPROVED, REJECTED, UNDER_REVIEW) on an application.
    /// Creates AdminDecision record and ApplicationStatusHistory entry.
    /// </summary>
    public async Task<AdminDecisionDto?> MakeDecisionAsync(
        int applicationId,
        int adminUserId,
        MakeDecisionRequestDto request,
        string currentStatus,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Decision))
            throw new InvalidOperationException("Decision is required.");

        var normalizedDecision = request.Decision.Trim().ToUpperInvariant();
        if (!ValidDecisions.Contains(normalizedDecision))
            throw new InvalidOperationException($"Invalid decision. Allowed: {string.Join(", ", ValidDecisions)}");

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

        // Record status history transition
        var newStatus = normalizedDecision;
        if (newStatus != currentStatus)
        {
            var history = new ApplicationStatusHistory
            {
                ApplicationId = applicationId,
                OldStatus = currentStatus,
                NewStatus = newStatus,
                Remarks = decision.Remarks,
                ChangedBy = adminUserId,
                ChangedAtUtc = DateTime.UtcNow
            };

            await _history.AddAsync(history, cancellationToken);
        }

        await _decisions.SaveChangesAsync(cancellationToken);

        return MapDecisionDto(decision);
    }

    /// <summary>
    /// Get the latest admin decision for an application.
    /// </summary>
    public async Task<AdminDecisionDto?> GetDecisionAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        var decision = await _decisions.GetLatestByApplicationIdAsync(applicationId, cancellationToken);
        return decision == null ? null : MapDecisionDto(decision);
    }

    /// <summary>
    /// Get status history timeline for an application.
    /// </summary>
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
    /// Simulate document verification. In production, this would call DocumentService.
    /// </summary>
    public async Task<bool> VerifyDocumentAsync(
        int documentId,
        int adminUserId,
        VerifyDocumentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
            throw new InvalidOperationException("Document status is required.");

        var normalizedStatus = request.Status.Trim().ToUpperInvariant();
        if (normalizedStatus is not ("VERIFIED" or "REJECTED"))
            throw new InvalidOperationException("Document status must be VERIFIED or REJECTED.");

        // TODO: Call DocumentService to update document status
        // For now, return success - in production this would call the DocumentService HTTP endpoint
        await Task.Delay(100, cancellationToken); // Simulate async work

        return true;
    }

    /// <summary>
    /// Generate a summary report of all applications.
    /// </summary>
    public async Task<AdminReportSummaryDto> GetReportSummaryAsync(CancellationToken cancellationToken = default)
    {
        var queue = await _queue.GetQueueAsync(null, cancellationToken);

        var approvedDecisions = new HashSet<int>();
        var rejectedDecisions = new HashSet<int>();
        var underReviewDecisions = new HashSet<int>();

        var allDecisions = new List<AdminDecision>();

        // In production, fetch from decisions table; for MVP we use empty list
        // var allDecisions = await _decisions.GetAllAsync(cancellationToken);

        foreach (var decision in allDecisions)
        {
            if (decision.Decision.Equals("APPROVED", StringComparison.OrdinalIgnoreCase))
                approvedDecisions.Add(decision.ApplicationId);
            else if (decision.Decision.Equals("REJECTED", StringComparison.OrdinalIgnoreCase))
                rejectedDecisions.Add(decision.ApplicationId);
            else if (decision.Decision.Equals("UNDER_REVIEW", StringComparison.OrdinalIgnoreCase))
                underReviewDecisions.Add(decision.ApplicationId);
        }

        var pendingApps = queue.Where(x => x.Status.Equals("PENDING", StringComparison.OrdinalIgnoreCase)).ToList();
        var submittedApps = queue.Where(x => x.Status.Equals("SUBMITTED", StringComparison.OrdinalIgnoreCase)).ToList();

        var approvedAmount = queue
            .Where(x => approvedDecisions.Contains(x.Id))
            .Sum(x => x.Amount);

        return new AdminReportSummaryDto
        {
            TotalApplications = queue.Count,
            ApprovedCount = approvedDecisions.Count,
            RejectedCount = rejectedDecisions.Count,
            UnderReviewCount = underReviewDecisions.Count,
            PendingCount = pendingApps.Count + submittedApps.Count,
            ApprovedTotalAmount = approvedAmount,
            GeneratedAtUtc = DateTime.UtcNow
        };
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
        CreatedBy = d.CreatedBy,
        CreatedAtUtc = d.CreatedAtUtc
    };
}
