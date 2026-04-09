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

            entity.Property(x => x.MobileNumber)
                .HasMaxLength(20);

            entity.Property(x => x.Address)
                .HasMaxLength(500);

            entity.Property(x => x.EmploymentStatus)
                .HasMaxLength(50);

            entity.Property(x => x.BankName)
                .HasMaxLength(100);

            entity.Property(x => x.BankAccountNumber)
                .HasMaxLength(30);

            entity.Property(x => x.IfscCode)
                .HasMaxLength(20);

            entity.Property(x => x.AnnualIncome)
                .HasPrecision(18, 2);

            entity.HasIndex(x => x.Email).IsUnique();
        });
    }
}