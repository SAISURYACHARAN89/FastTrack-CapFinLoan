namespace CapFinLoan.Wallet.API.Domain;

public enum WithdrawalStatus { PENDING, APPROVED, REJECTED }

public sealed class WithdrawalRequest
{
    public int Id { get; private set; }
    public int UserId { get; private set; }

    /// <summary>Amount in paise.</summary>
    public long AmountPaise { get; private set; }

    public WithdrawalStatus Status { get; private set; }
    public string? BankAccount { get; private set; }
    public string? IfscCode { get; private set; }
    public string? AccountHolderName { get; private set; }
    public string? AdminNote { get; private set; }
    public int? ReviewedByAdminId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    // EF Core constructor
    private WithdrawalRequest() { }

    public static WithdrawalRequest Create(
        int userId,
        long amountPaise,
        string bankAccount,
        string ifscCode,
        string accountHolderName) => new()
    {
        UserId = userId,
        AmountPaise = amountPaise,
        Status = WithdrawalStatus.PENDING,
        BankAccount = bankAccount,
        IfscCode = ifscCode,
        AccountHolderName = accountHolderName,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public void Approve(int adminId, string? note = null)
    {
        Status = WithdrawalStatus.APPROVED;
        ReviewedByAdminId = adminId;
        AdminNote = note;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(int adminId, string? note = null)
    {
        Status = WithdrawalStatus.REJECTED;
        ReviewedByAdminId = adminId;
        AdminNote = note;
        UpdatedAt = DateTime.UtcNow;
    }
}
