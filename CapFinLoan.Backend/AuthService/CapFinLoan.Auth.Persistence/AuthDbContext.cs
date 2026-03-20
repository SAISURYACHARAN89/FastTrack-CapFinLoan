using Microsoft.EntityFrameworkCore;
using CapFinLoan.Auth.Domain.Entities;

namespace CapFinLoan.Auth.Persistence;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
}