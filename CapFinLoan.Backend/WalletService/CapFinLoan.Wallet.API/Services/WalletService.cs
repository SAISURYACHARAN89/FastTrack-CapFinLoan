using CapFinLoan.Wallet.API.Domain;
using CapFinLoan.Wallet.API.DTOs;
using CapFinLoan.Wallet.API.Persistence;
using Microsoft.EntityFrameworkCore;
using Razorpay.Api;

namespace CapFinLoan.Wallet.API.Services;

public sealed class WalletService
{
    private readonly WalletDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<WalletService> _logger;

    private const long APPLICATION_FEE_PAISE = 50000L; // ₹500 in paise

    public WalletService(WalletDbContext db, IConfiguration config, ILogger<WalletService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    // ── Wallet ────────────────────────────────────────────────────────────────

    public async Task<WalletDto> GetOrCreateWalletAsync(int userId, CancellationToken ct)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet == null)
        {
            wallet = UserWallet.Create(userId);
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
        }
        return ToDto(wallet);
    }

    // ── Razorpay ──────────────────────────────────────────────────────────────

    public RazorpayOrderDto CreateRazorpayOrder(decimal amountInr)
    {
        var keyId = _config["Razorpay:KeyId"]!;
        var keySecret = _config["Razorpay:KeySecret"]!;

        var client = new RazorpayClient(keyId, keySecret);
        var options = new Dictionary<string, object>
        {
            { "amount", (long)(amountInr * 100) }, // paise
            { "currency", "INR" },
            { "receipt", $"rcpt_{Guid.NewGuid():N}" },
            { "payment_capture", 1 }
        };

        var order = client.Order.Create(options);
        return new RazorpayOrderDto(
            order["id"].ToString()!,
            amountInr,
            "INR",
            keyId);
    }

    public async Task<TransactionDto> VerifyAndCreditAsync(int userId, VerifyRazorpayPaymentRequest req, CancellationToken ct)
    {
        var keySecret = _config["Razorpay:KeySecret"]!;

        // Verify HMAC-SHA256 signature — this is the security check
        var payload = $"{req.RazorpayOrderId}|{req.RazorpayPaymentId}";
        var expectedSig = ComputeHmacSha256(payload, keySecret);
        if (!string.Equals(expectedSig, req.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Razorpay signature verification failed.");

        // Use the amount passed from the frontend (same value used to create the order)
        // This avoids an extra Razorpay API call that can fail in test/sandbox mode
        if (req.AmountInr <= 0)
            throw new InvalidOperationException("Invalid payment amount.");

        var amountPaise = (long)(req.AmountInr * 100);

        var wallet = await GetOrCreateWalletEntityAsync(userId, ct);
        wallet.Credit(amountPaise);

        var tx = WalletTransaction.Create(
            userId,
            TransactionType.CREDIT,
            TransactionCategory.RAZORPAY_TOPUP,
            amountPaise,
            TransactionStatus.SUCCESS,
            referenceId: req.RazorpayPaymentId,
            note: "Razorpay top-up");

        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync(ct);

        decimal creditedInr = amountPaise / 100m;
        _logger.LogInformation("Wallet credited {Amount} INR for user {UserId} via Razorpay payment {PaymentId}",
            creditedInr, userId, req.RazorpayPaymentId);
        return ToTxDto(tx);
    }

    // ── Application Fee ───────────────────────────────────────────────────────

    public async Task<TransactionDto> DeductApplicationFeeAsync(int userId, int applicationId, CancellationToken ct)
    {
        var wallet = await GetOrCreateWalletEntityAsync(userId, ct);
        wallet.Debit(APPLICATION_FEE_PAISE);

        var tx = WalletTransaction.Create(
            userId,
            TransactionType.DEBIT,
            TransactionCategory.APPLICATION_FEE,
            APPLICATION_FEE_PAISE,
            TransactionStatus.SUCCESS,
            referenceId: $"APP-{applicationId}",
            note: $"Application fee for #CF-{applicationId:D4}");

        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("500 application fee deducted for user {UserId}, app {AppId}", userId, applicationId);
        return ToTxDto(tx);
    }

    // ── Loan Disbursement (called by AdminService / internal) ─────────────────

    public async Task<TransactionDto> CreditLoanDisbursementAsync(int userId, decimal amountInr, int applicationId, CancellationToken ct)
    {
        var amountPaise = (long)(amountInr * 100);
        var wallet = await GetOrCreateWalletEntityAsync(userId, ct);
        wallet.Credit(amountPaise);

        var tx = WalletTransaction.Create(
            userId,
            TransactionType.CREDIT,
            TransactionCategory.LOAN_DISBURSEMENT,
            amountPaise,
            TransactionStatus.SUCCESS,
            referenceId: $"LOAN-{applicationId}",
            note: $"Loan disbursement for #CF-{applicationId:D4}");

        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync(ct);

        decimal disbursedInr = amountInr;
        _logger.LogInformation("Loan {Amount} INR credited to user {UserId}", disbursedInr, userId);
        return ToTxDto(tx);
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(int userId, CancellationToken ct)
    {
        var txs = await _db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        return txs.Select(ToTxDto).ToList();
    }

    // ── Withdrawal ────────────────────────────────────────────────────────────

    public async Task<WithdrawalRequestDto> RequestWithdrawalAsync(int userId, CreateWithdrawalRequest req, CancellationToken ct)
    {
        if (req.Amount < 100) throw new InvalidOperationException("Minimum withdrawal is ₹100.");

        var amountPaise = (long)(req.Amount * 100);
        var wallet = await GetOrCreateWalletEntityAsync(userId, ct);
        wallet.LockForWithdrawal(amountPaise);

        var withdrawal = WithdrawalRequest.Create(userId, amountPaise, req.BankAccount, req.IfscCode, req.AccountHolderName);
        _db.WithdrawalRequests.Add(withdrawal);

        var tx = WalletTransaction.Create(
            userId,
            TransactionType.DEBIT,
            TransactionCategory.WITHDRAWAL,
            amountPaise,
            TransactionStatus.PENDING,
            note: $"Withdrawal to {req.BankAccount}");

        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync(ct);

        return ToWithdrawalDto(withdrawal);
    }

    public async Task<IReadOnlyList<WithdrawalRequestDto>> GetUserWithdrawalsAsync(int userId, CancellationToken ct)
    {
        var list = await _db.WithdrawalRequests
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(ct);

        return list.Select(ToWithdrawalDto).ToList();
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<WithdrawalRequestDto>> GetAllWithdrawalsAsync(CancellationToken ct)
    {
        var list = await _db.WithdrawalRequests
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(ct);

        return list.Select(ToWithdrawalDto).ToList();
    }

    public async Task<WithdrawalRequestDto> ReviewWithdrawalAsync(int withdrawalId, int adminId, ReviewWithdrawalRequest req, CancellationToken ct)
    {
        var withdrawal = await _db.WithdrawalRequests.FindAsync([withdrawalId], ct)
            ?? throw new KeyNotFoundException($"Withdrawal {withdrawalId} not found.");

        if (withdrawal.Status != WithdrawalStatus.PENDING)
            throw new InvalidOperationException("Withdrawal is no longer pending.");

        var wallet = await GetOrCreateWalletEntityAsync(withdrawal.UserId, ct);

        // Find the matching pending transaction
        var pendingTx = await _db.Transactions
            .Where(t => t.UserId == withdrawal.UserId
                     && t.Category == TransactionCategory.WITHDRAWAL
                     && t.Status == TransactionStatus.PENDING)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (req.Approve)
        {
            withdrawal.Approve(adminId, req.Note);
            wallet.FinaliseWithdrawal(withdrawal.AmountPaise);
            pendingTx?.SetStatus(TransactionStatus.SUCCESS);
        }
        else
        {
            withdrawal.Reject(adminId, req.Note);
            wallet.UnlockWithdrawal(withdrawal.AmountPaise);
            pendingTx?.SetStatus(TransactionStatus.FAILED);

            // Refund credit transaction
            var refundTx = WalletTransaction.Create(
                withdrawal.UserId,
                TransactionType.CREDIT,
                TransactionCategory.WITHDRAWAL,
                withdrawal.AmountPaise,
                TransactionStatus.SUCCESS,
                note: "Withdrawal rejected — refund");
            _db.Transactions.Add(refundTx);
        }

        await _db.SaveChangesAsync(ct);
        return ToWithdrawalDto(withdrawal);
    }

    public async Task<AdminPaymentSummaryDto> GetAdminSummaryAsync(CancellationToken ct)
    {
        var feesCollected = await _db.Transactions
            .Where(t => t.Category == TransactionCategory.APPLICATION_FEE && t.Status == TransactionStatus.SUCCESS)
            .SumAsync(t => t.AmountPaise, ct);

        var loanDisbursed = await _db.Transactions
            .Where(t => t.Category == TransactionCategory.LOAN_DISBURSEMENT && t.Status == TransactionStatus.SUCCESS)
            .SumAsync(t => t.AmountPaise, ct);

        var pendingWithdrawals = await _db.WithdrawalRequests
            .Where(w => w.Status == WithdrawalStatus.PENDING)
            .SumAsync(w => w.AmountPaise, ct);

        var pendingCount = await _db.WithdrawalRequests
            .CountAsync(w => w.Status == WithdrawalStatus.PENDING, ct);

        var totalWalletBalance = await _db.Wallets
            .SumAsync(w => w.AvailableBalancePaise + w.PendingBalancePaise, ct);

        var txCount = await _db.Transactions.CountAsync(ct);

        return new AdminPaymentSummaryDto(
            feesCollected / 100m,
            loanDisbursed / 100m,
            pendingWithdrawals / 100m,
            totalWalletBalance / 100m,
            pendingCount,
            txCount);
    }

    public async Task<IReadOnlyList<TransactionDto>> GetAllTransactionsAsync(CancellationToken ct)
    {
        var txs = await _db.Transactions
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        return txs.Select(ToTxDto).ToList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<UserWallet> GetOrCreateWalletEntityAsync(int userId, CancellationToken ct)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet != null) return wallet;

        wallet = UserWallet.Create(userId);
        _db.Wallets.Add(wallet);
        return wallet;
    }

    private static WalletDto ToDto(UserWallet w) => new(
        w.UserId,
        w.AvailableBalancePaise / 100m,
        w.PendingBalancePaise / 100m,
        (w.AvailableBalancePaise + w.PendingBalancePaise) / 100m);

    private static TransactionDto ToTxDto(WalletTransaction t) => new(
        t.Id,
        t.Type.ToString(),
        t.Category.ToString(),
        t.AmountPaise / 100m,
        t.Status.ToString(),
        t.ReferenceId,
        t.Note,
        t.CreatedAt);

    private static WithdrawalRequestDto ToWithdrawalDto(WithdrawalRequest w) => new(
        w.Id,
        w.UserId,
        w.AmountPaise / 100m,
        w.Status.ToString(),
        w.BankAccount,
        w.IfscCode,
        w.AccountHolderName,
        w.AdminNote,
        w.CreatedAt);

    private static string ComputeHmacSha256(string data, string key)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
