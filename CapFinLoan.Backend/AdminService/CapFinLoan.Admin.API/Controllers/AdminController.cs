using System.Security.Claims;
using CapFinLoan.Admin.Application.DTOs;
using CapFinLoan.Admin.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Admin.API.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "ADMIN")]
public sealed class AdminController : ControllerBase
{
    private readonly AdminService _service;

    public AdminController(AdminService service)
    {
        _service = service;
    }

    /// <summary>Get queue of all applications for admin review.</summary>
    [HttpGet("applications")]
    public async Task<ActionResult<IReadOnlyList<ApplicationQueueDto>>> GetQueue(CancellationToken cancellationToken)
    {
        var bearerToken = GetBearerToken();
        var queue = await _service.GetQueueAsync(bearerToken, cancellationToken);
        return Ok(queue);
    }

    /// <summary>
    /// Make a decision (APPROVED, REJECTED, UNDER_REVIEW).
    /// Fetches actual current status from ApplicationService, saves decision,
    /// then syncs the status back to ApplicationService.
    /// </summary>
    [HttpPost("applications/{id:int}/decision")]
    public async Task<ActionResult<AdminDecisionDto>> MakeDecision(
        [FromRoute] int id,
        [FromBody] MakeDecisionRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetAdminUserId(out var adminUserId))
            return Unauthorized();

        var bearerToken = GetBearerToken();
        var decision = await _service.MakeDecisionAsync(id, adminUserId, request, bearerToken, cancellationToken);
        return Ok(decision);
    }

    /// <summary>Get status history (timeline) for an application.</summary>
    [HttpGet("applications/{id:int}/history")]
    public async Task<ActionResult<IReadOnlyList<ApplicationStatusHistoryDto>>> GetHistory(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var history = await _service.GetHistoryAsync(id, cancellationToken);
        return Ok(history);
    }

    /// <summary>Verify a document (VERIFIED or REJECTED) — calls DocumentService via HTTP.</summary>
    [HttpPut("documents/{id:int}/verify")]
    public async Task<IActionResult> VerifyDocument(
        [FromRoute] int id,
        [FromBody] VerifyDocumentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetAdminUserId(out var adminUserId))
            return Unauthorized();

        var bearerToken = GetBearerToken();
        var verified = await _service.VerifyDocumentAsync(id, adminUserId, request, bearerToken, cancellationToken);
        return verified
            ? Ok(new { message = "Document verified." })
            : BadRequest(new { message = "DocumentService returned an error. Verify the document ID and status." });
    }

    /// <summary>Generate admin report summary (counts, totals, etc.)</summary>
    [HttpGet("reports/summary")]
    public async Task<ActionResult<AdminReportSummaryDto>> GetReportSummary(CancellationToken cancellationToken)
    {
        var bearerToken = GetBearerToken();
        var report = await _service.GetReportSummaryAsync(bearerToken, cancellationToken);
        return Ok(report);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool TryGetAdminUserId(out int userId)
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(val, out userId) && userId > 0;
    }

    /// <summary>Extracts the raw Authorization header value to forward to downstream services.</summary>
    private string? GetBearerToken() =>
        HttpContext.Request.Headers["Authorization"].FirstOrDefault();
}
