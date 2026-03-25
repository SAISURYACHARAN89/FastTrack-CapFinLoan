using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Admin.Persistence.Repositories;

public sealed class AdminHistoryRepository : IAdminHistoryRepository
{
    private readonly AdminDbContext _db;

    public AdminHistoryRepository(AdminDbContext db)
    {
        _db = db;
    }

    public Task AddAsync(ApplicationStatusHistory entry, CancellationToken cancellationToken = default)
    {
        return _db.ApplicationStatusHistories.AddAsync(entry, cancellationToken).AsTask();
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
