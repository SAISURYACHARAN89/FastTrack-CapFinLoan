using System.Security.Claims;
using CapFinLoan.Wallet.API.DTOs;
using CapFinLoan.Wallet.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Wallet.API.Controllers;

[ApiController]
[Route("admin/wallet")]
[Authorize(Roles = "ADMIN")]
public sealed class AdminWalletController : ControllerBase
{
    private readonly WalletService _service;

    public AdminWalletController(WalletService service) => _service = service;

    // ── Dashboard Summary ─────────────────────────────────────────────────────

    /// <summary>System-wide payment summary for admin dashboard.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<AdminPaymentSummaryDto>> GetSummary(CancellationToken ct)
    {
        var summary = await _service.GetAdminSummaryAsync(ct);
        return Ok(summary);
    }

    // ── All Transactions ──────────────────────────────────────────────────────

    /// <summary>All transactions across all users (admin view).</summary>
    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> GetAllTransactions(CancellationToken ct)
    {
        var txs = await _service.GetAllTransactionsAsync(ct);
        return Ok(txs);
    }

    // ── Withdrawals ───────────────────────────────────────────────────────────

    /// <summary>All withdrawal requests (admin view).</summary>
    [HttpGet("withdrawals")]
    public async Task<ActionResult<IReadOnlyList<WithdrawalRequestDto>>> GetAllWithdrawals(CancellationToken ct)
    {
        var list = await _service.GetAllWithdrawalsAsync(ct);
        return Ok(list);
    }

    /// <summary>Approve or reject a withdrawal request.</summary>
    [HttpPost("withdrawals/{id:int}/review")]
    public async Task<ActionResult<WithdrawalRequestDto>> ReviewWithdrawal(
        [FromRoute] int id,
        [FromBody] ReviewWithdrawalRequest req,
        CancellationToken ct)
    {
        if (!TryGetAdminId(out var adminId)) return Unauthorized();
        var result = await _service.ReviewWithdrawalAsync(id, adminId, req, ct);
        return Ok(result);
    }

    // ── Loan Disbursement (internal trigger) ──────────────────────────────────

    /// <summary>Credit loan disbursement to a user's wallet after approval.</summary>
    [HttpPost("disburse")]
    public async Task<ActionResult<TransactionDto>> DisburseLoans(
        [FromBody] CreditLoanDisbursementRequest req,
        CancellationToken ct)
    {
        var tx = await _service.CreditLoanDisbursementAsync(req.UserId, req.Amount, req.ApplicationId, ct);
        return Ok(tx);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool TryGetAdminId(out int adminId)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out adminId) && adminId > 0;
    }
}
