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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(x => x.PasswordHash)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(x => x.Role)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasIndex(x => x.Email).IsUnique();
        });
    }
}