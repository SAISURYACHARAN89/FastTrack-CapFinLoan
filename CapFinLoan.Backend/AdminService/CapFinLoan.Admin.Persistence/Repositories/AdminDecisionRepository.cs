using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Admin.Persistence.Repositories;

public sealed class AdminDecisionRepository : IAdminDecisionRepository
{
    private readonly AdminDbContext _db;

    public AdminDecisionRepository(AdminDbContext db)
    {
        _db = db;
    }

    public Task AddAsync(AdminDecision decision, CancellationToken cancellationToken = default)
    {
        return _db.AdminDecisions.AddAsync(decision, cancellationToken).AsTask();
    }

    public Task<AdminDecision?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _db.AdminDecisions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<AdminDecision?> GetLatestByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        return _db.AdminDecisions
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminDecision>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        return await _db.AdminDecisions
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
