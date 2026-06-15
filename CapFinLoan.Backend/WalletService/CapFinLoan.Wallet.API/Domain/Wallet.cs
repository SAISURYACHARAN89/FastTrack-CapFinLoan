namespace CapFinLoan.Wallet.API.Domain;

/// <summary>One wallet per user. Balances are stored in paise (integer) to avoid floating-point drift.</summary>
public sealed class UserWallet
{
    public int Id { get; private set; }
    public int UserId { get; private set; }

    /// <summary>Available balance in paise (1 INR = 100 paise).</summary>
    public long AvailableBalancePaise { get; private set; }

    /// <summary>Balance locked in pending withdrawals.</summary>
    public long PendingBalancePaise { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    // EF Core constructor
    private UserWallet() { }

    public static UserWallet Create(int userId) => new()
    {
        UserId = userId,
        AvailableBalancePaise = 0,
        PendingBalancePaise = 0,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public void Credit(long amountPaise)
    {
        if (amountPaise <= 0) throw new InvalidOperationException("Credit amount must be positive.");
        AvailableBalancePaise += amountPaise;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Debit(long amountPaise)
    {
        if (amountPaise <= 0) throw new InvalidOperationException("Debit amount must be positive.");
        if (AvailableBalancePaise < amountPaise) throw new InvalidOperationException("Insufficient wallet balance.");
        AvailableBalancePaise -= amountPaise;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Lock funds for a pending withdrawal.</summary>
    public void LockForWithdrawal(long amountPaise)
    {
        Debit(amountPaise);
        PendingBalancePaise += amountPaise;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Release locked funds back to available (withdrawal rejected).</summary>
    public void UnlockWithdrawal(long amountPaise)
    {
        PendingBalancePaise -= amountPaise;
        AvailableBalancePaise += amountPaise;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Finalise a withdrawal — remove from pending (withdrawal approved).</summary>
    public void FinaliseWithdrawal(long amountPaise)
    {
        PendingBalancePaise -= amountPaise;
        UpdatedAt = DateTime.UtcNow;
    }
}
