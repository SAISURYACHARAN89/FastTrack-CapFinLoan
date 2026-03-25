using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Interfaces;

public interface IApplicationRepository
{
    Task AddAsync(LoanApplication application, CancellationToken cancellationToken = default);
    Task<LoanApplication?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<LoanApplication?> GetByIdForUserAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<LoanApplication?> GetByIdForUserForUpdateAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<LoanApplication?> GetByIdForUpdateAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LoanApplication>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LoanApplication>> GetAllAsync(CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
