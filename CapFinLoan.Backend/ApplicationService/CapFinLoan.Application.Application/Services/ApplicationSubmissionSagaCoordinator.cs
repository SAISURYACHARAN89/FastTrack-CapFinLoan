using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace CapFinLoan.Application.Application.Services;

public class ApplicationSubmissionSagaCoordinator : IApplicationSubmissionSagaCoordinator
{
    private readonly IApplicationRepository _applications;
    private readonly IApplicationStatusHistoryRepository _history;
    private readonly IApplicationSubmissionSagaRepository _sagas;
    private readonly ILogger<ApplicationSubmissionSagaCoordinator> _logger;

    public ApplicationSubmissionSagaCoordinator(
        IApplicationRepository applications,
        IApplicationStatusHistoryRepository history,
        IApplicationSubmissionSagaRepository sagas,
        ILogger<ApplicationSubmissionSagaCoordinator> logger)
    {
        _applications = applications;
        _history = history;
        _sagas = sagas;
        _logger = logger;
    }

    public async Task StartSubmissionSagaAsync(int applicationId, int userId, CancellationToken cancellationToken = default)
    {
        var existing = await _sagas.GetByApplicationIdForUpdateAsync(applicationId, cancellationToken);
        if (existing != null)
        {
            existing.State = "SUBMISSION_INITIATED";
            existing.IsCompleted = false;
            existing.IsCompensated = false;
            existing.LastError = null;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            existing.CompletedAtUtc = null;
            await _sagas.SaveChangesAsync(cancellationToken);
            return;
        }

        await _sagas.AddAsync(new ApplicationSubmissionSaga
        {
            ApplicationId = applicationId,
            UserId = userId,
            State = "SUBMISSION_INITIATED",
            IsCompleted = false,
            IsCompensated = false,
            StartedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _sagas.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkSubmissionEventPublishedAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        var saga = await _sagas.GetByApplicationIdForUpdateAsync(applicationId, cancellationToken);
        if (saga == null)
            return;

        saga.State = "AWAITING_ADMIN_DECISION";
        saga.UpdatedAtUtc = DateTime.UtcNow;
        await _sagas.SaveChangesAsync(cancellationToken);
    }

    public async Task CompensateSubmissionFailureAsync(int applicationId, string fallbackStatus, string reason, CancellationToken cancellationToken = default)
    {
        var application = await _applications.GetByIdForUpdateAsync(applicationId, cancellationToken);
        if (application == null)
            return;

        application.Status = fallbackStatus;

        await _history.AddAsync(new ApplicationStatusHistory
        {
            ApplicationId = application.Id,
            UserId = application.UserId,
            Status = fallbackStatus,
            ChangedAtUtc = DateTime.UtcNow,
            Note = $"Saga compensation applied: {reason}"
        }, cancellationToken);

        var saga = await _sagas.GetByApplicationIdForUpdateAsync(applicationId, cancellationToken);
        if (saga != null)
        {
            saga.State = "COMPENSATED";
            saga.IsCompensated = true;
            saga.IsCompleted = true;
            saga.LastError = reason.Length > 1000 ? reason[..1000] : reason;
            saga.UpdatedAtUtc = DateTime.UtcNow;
            saga.CompletedAtUtc = DateTime.UtcNow;
        }

        await _sagas.SaveChangesAsync(cancellationToken);

        _logger.LogWarning(
            "Saga compensation applied for ApplicationId {ApplicationId}. Restored status to {Status}. Reason: {Reason}",
            applicationId,
            fallbackStatus,
            reason);
    }

    public async Task CompleteByAdminDecisionAsync(int applicationId, string decision, CancellationToken cancellationToken = default)
    {
        var saga = await _sagas.GetByApplicationIdForUpdateAsync(applicationId, cancellationToken);
        if (saga == null || saga.IsCompleted)
        {
            return;
        }

        saga.State = $"ADMIN_DECISION_{decision.ToUpperInvariant()}";
        saga.IsCompleted = true;
        saga.UpdatedAtUtc = DateTime.UtcNow;
        saga.CompletedAtUtc = DateTime.UtcNow;
        await _sagas.SaveChangesAsync(cancellationToken);
    }
}
