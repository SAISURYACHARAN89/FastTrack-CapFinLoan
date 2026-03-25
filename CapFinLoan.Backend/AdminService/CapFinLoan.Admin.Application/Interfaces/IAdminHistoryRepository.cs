using CapFinLoan.Admin.Domain.Entities;

namespace CapFinLoan.Admin.Application.Interfaces;

public interface IAdminHistoryRepository
{
    Task AddAsync(ApplicationStatusHistory entry, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ApplicationStatusHistory>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
