using System.Security.Claims;
using CapFinLoan.Wallet.API.DTOs;
using CapFinLoan.Wallet.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Wallet.API.Controllers;

[ApiController]
[Route("wallet")]
[Authorize]
public sealed class WalletController : ControllerBase
{
    private readonly WalletService _service;

    public WalletController(WalletService service) => _service = service;

    // ── Wallet Balance ────────────────────────────────────────────────────────

    /// <summary>Get the authenticated user's wallet balance.</summary>
    [HttpGet]
    public async Task<ActionResult<WalletDto>> GetWallet(CancellationToken ct)
    {
        var userId = GetUserId();
        var wallet = await _service.GetOrCreateWalletAsync(userId, ct);
        return Ok(wallet);
    }

    // ── Razorpay ──────────────────────────────────────────────────────────────

    /// <summary>Create a Razorpay order to top-up the wallet.</summary>
    [HttpPost("razorpay/order")]
    public ActionResult<RazorpayOrderDto> CreateOrder([FromBody] CreateRazorpayOrderRequest req)
    {
        if (req.Amount < 1) return BadRequest(new { message = "Minimum top-up is ₹1." });
        var order = _service.CreateRazorpayOrder(req.Amount);
        return Ok(order);
    }

    /// <summary>Verify Razorpay payment and credit wallet.</summary>
    [HttpPost("razorpay/verify")]
    public async Task<ActionResult<TransactionDto>> VerifyPayment(
        [FromBody] VerifyRazorpayPaymentRequest req,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var tx = await _service.VerifyAndCreditAsync(userId, req, ct);
        return Ok(tx);
    }

    // ── Application Fee ───────────────────────────────────────────────────────

    /// <summary>Deduct ₹500 application fee from wallet.</summary>
    [HttpPost("deduct-fee")]
    public async Task<ActionResult<TransactionDto>> DeductFee(
        [FromBody] DeductApplicationFeeRequest req,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var tx = await _service.DeductApplicationFeeAsync(userId, req.ApplicationId, ct);
        return Ok(tx);
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    /// <summary>Get the authenticated user's transaction history.</summary>
    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> GetTransactions(CancellationToken ct)
    {
        var userId = GetUserId();
        var txs = await _service.GetTransactionsAsync(userId, ct);
        return Ok(txs);
    }

    // ── Withdrawal ────────────────────────────────────────────────────────────

    /// <summary>Submit a withdrawal request.</summary>
    [HttpPost("withdraw")]
    public async Task<ActionResult<WithdrawalRequestDto>> RequestWithdrawal(
        [FromBody] CreateWithdrawalRequest req,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var withdrawal = await _service.RequestWithdrawalAsync(userId, req, ct);
        return Ok(withdrawal);
    }

    /// <summary>Get the authenticated user's withdrawal history.</summary>
    [HttpGet("withdrawals")]
    public async Task<ActionResult<IReadOnlyList<WithdrawalRequestDto>>> GetWithdrawals(CancellationToken ct)
    {
        var userId = GetUserId();
        var list = await _service.GetUserWithdrawalsAsync(userId, ct);
        return Ok(list);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var id))
            throw new UnauthorizedAccessException("Invalid or missing user id claim.");
        return id;
    }
}
