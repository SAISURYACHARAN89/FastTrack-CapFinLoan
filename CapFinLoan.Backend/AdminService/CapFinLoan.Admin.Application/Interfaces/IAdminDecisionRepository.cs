using CapFinLoan.Admin.Domain.Entities;

namespace CapFinLoan.Admin.Application.Interfaces;

public interface IAdminDecisionRepository
{
    Task AddAsync(AdminDecision decision, CancellationToken cancellationToken = default);

    Task<AdminDecision?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<AdminDecision?> GetLatestByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminDecision>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminDecision>> GetAllAsync(CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
