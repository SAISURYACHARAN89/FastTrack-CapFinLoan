using CapFinLoan.Wallet.API.Domain;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Wallet.API.Persistence;

public sealed class WalletDbContext : DbContext
{
    public WalletDbContext(DbContextOptions<WalletDbContext> options) : base(options) { }

    public DbSet<UserWallet> Wallets => Set<UserWallet>();
    public DbSet<WalletTransaction> Transactions => Set<WalletTransaction>();
    public DbSet<WithdrawalRequest> WithdrawalRequests => Set<WithdrawalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserWallet>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.AvailableBalancePaise).HasDefaultValue(0L);
            e.Property(x => x.PendingBalancePaise).HasDefaultValue(0L);
        });

        modelBuilder.Entity<WalletTransaction>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.Category).HasConversion<string>();
            e.Property(x => x.Status).HasConversion<string>();
        });

        modelBuilder.Entity<WithdrawalRequest>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Status).HasConversion<string>();
        });
    }
}
