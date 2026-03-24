using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Application.Persistence.Repositories;

public sealed class ApplicationRepository : IApplicationRepository
{
    private readonly ApplicationDbContext _db;

    public ApplicationRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(LoanApplication application, CancellationToken cancellationToken = default)
    {
        await _db.LoanApplications.AddAsync(application, cancellationToken);
    }

    public Task<LoanApplication?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _db.LoanApplications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<LoanApplication?> GetByIdForUserAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        return _db.LoanApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
    }

    public Task<LoanApplication?> GetByIdForUserForUpdateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        return _db.LoanApplications
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<LoanApplication>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await _db.LoanApplications
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
