using CapFinLoan.Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Application.Persistence;

public sealed class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<LoanApplication> LoanApplications => Set<LoanApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<LoanApplication>(entity =>
        {
            entity.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.CreatedAt);
        });
    }
}
