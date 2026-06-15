namespace CapFinLoan.Wallet.API.Domain;

public enum TransactionType { CREDIT, DEBIT }
public enum TransactionCategory { APPLICATION_FEE, LOAN_DISBURSEMENT, WITHDRAWAL, RAZORPAY_TOPUP }
public enum TransactionStatus { PENDING, SUCCESS, FAILED }

public sealed class WalletTransaction
{
    public int Id { get; private set; }
    public int UserId { get; private set; }
    public TransactionType Type { get; private set; }
    public TransactionCategory Category { get; private set; }

    /// <summary>Amount in paise.</summary>
    public long AmountPaise { get; private set; }

    public TransactionStatus Status { get; private set; }
    public string? ReferenceId { get; private set; }
    public string? Note { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    // EF Core constructor
    private WalletTransaction() { }

    public static WalletTransaction Create(
        int userId,
        TransactionType type,
        TransactionCategory category,
        long amountPaise,
        TransactionStatus status = TransactionStatus.PENDING,
        string? referenceId = null,
        string? note = null) => new()
    {
        UserId = userId,
        Type = type,
        Category = category,
        AmountPaise = amountPaise,
        Status = status,
        ReferenceId = referenceId,
        Note = note,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public void SetStatus(TransactionStatus status)
    {
        Status = status;
        UpdatedAt = DateTime.UtcNow;
    }
}
