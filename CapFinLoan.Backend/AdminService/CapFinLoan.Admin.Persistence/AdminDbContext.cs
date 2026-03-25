using CapFinLoan.Admin.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Admin.Persistence;

public sealed class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options)
        : base(options)
    {
    }

    public DbSet<AdminDecision> AdminDecisions => Set<AdminDecision>();

    public DbSet<ApplicationStatusHistory> ApplicationStatusHistories => Set<ApplicationStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AdminDecision>(entity =>
        {
            entity.Property(x => x.Decision)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Remarks)
                .HasMaxLength(500);

            entity.Property(x => x.ApprovedAmount)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.InterestRate)
                .HasColumnType("decimal(5,2)");

            entity.HasIndex(x => x.ApplicationId);
            entity.HasIndex(x => x.Decision);
            entity.HasIndex(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<ApplicationStatusHistory>(entity =>
        {
            entity.Property(x => x.OldStatus)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.NewStatus)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Remarks)
                .HasMaxLength(500);

            entity.HasIndex(x => x.ApplicationId);
            entity.HasIndex(x => x.ChangedAtUtc);
        });
    }
}
