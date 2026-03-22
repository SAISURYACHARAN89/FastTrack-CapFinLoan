using CapFinLoan.Auth.Application.Interfaces;
using CapFinLoan.Auth.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Auth.Persistence.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AuthDbContext _db;

    public UserRepository(AuthDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    public Task<User?> GetByEmailForUpdateAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return _db.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _db.Users.AddAsync(user, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
