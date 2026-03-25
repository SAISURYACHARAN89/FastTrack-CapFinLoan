using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Interfaces;

public interface IApplicationStatusHistoryRepository
{
    Task AddAsync(ApplicationStatusHistory entry, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ApplicationStatusHistory>> GetByApplicationIdForUserAsync(int applicationId, int userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ApplicationStatusHistory>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
