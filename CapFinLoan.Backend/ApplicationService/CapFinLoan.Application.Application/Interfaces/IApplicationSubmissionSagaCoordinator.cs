using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Interfaces;

public interface IApplicationSubmissionSagaCoordinator
{
    Task StartSubmissionSagaAsync(int applicationId, int userId, CancellationToken cancellationToken = default);
    Task MarkSubmissionEventPublishedAsync(int applicationId, CancellationToken cancellationToken = default);
    Task CompensateSubmissionFailureAsync(int applicationId, string fallbackStatus, string reason, CancellationToken cancellationToken = default);
    Task CompleteByAdminDecisionAsync(int applicationId, string decision, CancellationToken cancellationToken = default);
}
