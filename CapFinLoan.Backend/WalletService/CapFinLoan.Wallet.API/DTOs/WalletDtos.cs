namespace CapFinLoan.Wallet.API.DTOs;

// ── Wallet ────────────────────────────────────────────────────────────────────

public sealed record WalletDto(
    int UserId,
    decimal AvailableBalance,
    decimal PendingBalance,
    decimal TotalBalance);

// ── Transactions ──────────────────────────────────────────────────────────────

public sealed record TransactionDto(
    int Id,
    string Type,
    string Category,
    decimal Amount,
    string Status,
    string? ReferenceId,
    string? Note,
    DateTime CreatedAt);

// ── Razorpay ──────────────────────────────────────────────────────────────────

public sealed record CreateRazorpayOrderRequest(decimal Amount);

public sealed record RazorpayOrderDto(
    string OrderId,
    decimal Amount,
    string Currency,
    string KeyId);

public sealed record VerifyRazorpayPaymentRequest(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature,
    /// <summary>Original order amount in INR passed from frontend — avoids re-fetching from Razorpay API.</summary>
    decimal AmountInr);

// ── Application Fee ───────────────────────────────────────────────────────────

public sealed record DeductApplicationFeeRequest(int ApplicationId);

// ── Loan Disbursement ─────────────────────────────────────────────────────────

public sealed record CreditLoanDisbursementRequest(
    int UserId,
    decimal Amount,
    int ApplicationId);

// ── Withdrawal ────────────────────────────────────────────────────────────────

public sealed record WithdrawalRequestDto(
    int Id,
    int UserId,
    decimal Amount,
    string Status,
    string? BankAccount,
    string? IfscCode,
    string? AccountHolderName,
    string? AdminNote,
    DateTime CreatedAt);

public sealed record CreateWithdrawalRequest(
    decimal Amount,
    string BankAccount,
    string IfscCode,
    string AccountHolderName);

public sealed record ReviewWithdrawalRequest(
    bool Approve,
    string? Note);

// ── Admin Dashboard ───────────────────────────────────────────────────────────

public sealed record AdminPaymentSummaryDto(
    decimal TotalFeesCollected,
    decimal TotalLoanDisbursed,
    decimal TotalPendingWithdrawals,
    decimal TotalActiveWalletBalance,
    int PendingWithdrawalCount,
    int TotalTransactionCount);
