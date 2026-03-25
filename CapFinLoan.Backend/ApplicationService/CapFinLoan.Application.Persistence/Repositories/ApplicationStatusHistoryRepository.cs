using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Application.Persistence.Repositories;

public sealed class ApplicationStatusHistoryRepository : IApplicationStatusHistoryRepository
{
    private readonly ApplicationDbContext _db;

    public ApplicationStatusHistoryRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task AddAsync(ApplicationStatusHistory entry, CancellationToken cancellationToken = default)
    {
        return _db.ApplicationStatusHistories.AddAsync(entry, cancellationToken).AsTask();
    }

    public async Task<IReadOnlyList<ApplicationStatusHistory>> GetByApplicationIdForUserAsync(int applicationId, int userId, CancellationToken cancellationToken = default)
    {
        return await _db.ApplicationStatusHistories
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId && x.UserId == userId)
            .OrderBy(x => x.ChangedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ApplicationStatusHistory>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        return await _db.ApplicationStatusHistories
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderBy(x => x.ChangedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
