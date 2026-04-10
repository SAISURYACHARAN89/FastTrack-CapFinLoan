using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Interfaces;

public interface IApplicationSubmissionSagaRepository
{
    Task<ApplicationSubmissionSaga?> GetByApplicationIdForUpdateAsync(int applicationId, CancellationToken cancellationToken = default);
    Task AddAsync(ApplicationSubmissionSaga saga, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
