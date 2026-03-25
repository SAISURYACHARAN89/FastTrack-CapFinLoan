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

    /// <summary>
    /// Get queue of all applications for admin review.
    /// </summary>
    [HttpGet("applications")]
    public async Task<ActionResult<IReadOnlyList<ApplicationQueueDto>>> GetQueue(CancellationToken cancellationToken)
    {
        try
        {
            var bearerToken = HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            var queue = await _service.GetQueueAsync(bearerToken, cancellationToken);
            return Ok(queue);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Make a decision on an application (APPROVED, REJECTED, UNDER_REVIEW).
    /// Requires admin role.
    /// </summary>
    [HttpPost("applications/{id:int}/decision")]
    public async Task<ActionResult<AdminDecisionDto>> MakeDecision(
        [FromRoute] int id,
        [FromBody] MakeDecisionRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetAdminUserId(out var adminUserId))
            return Unauthorized();

        try
        {
            // In a real scenario, we'd fetch the current application status from ApplicationService
            // For MVP, we default to the decision status
            var currentStatus = "SUBMITTED";

            var decision = await _service.MakeDecisionAsync(id, adminUserId, request, currentStatus, cancellationToken);

            return Ok(decision);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get status history (timeline) for an application.
    /// </summary>
    [HttpGet("applications/{id:int}/history")]
    public async Task<ActionResult<IReadOnlyList<ApplicationStatusHistoryDto>>> GetHistory(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var history = await _service.GetHistoryAsync(id, cancellationToken);
            return Ok(history);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Verify a document (VERIFIED or REJECTED).
    /// Simulated for now; calls DocumentService in production.
    /// </summary>
    [HttpPost("documents/{id:int}/verify")]
    public async Task<IActionResult> VerifyDocument(
        [FromRoute] int id,
        [FromBody] VerifyDocumentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetAdminUserId(out var adminUserId))
            return Unauthorized();

        try
        {
            var verified = await _service.VerifyDocumentAsync(id, adminUserId, request, cancellationToken);
            return verified ? Ok(new { message = "Document verified" }) : BadRequest(new { message = "Failed to verify document" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Generate admin report summary (counts, totals, etc.)
    /// </summary>
    [HttpGet("reports/summary")]
    public async Task<ActionResult<AdminReportSummaryDto>> GetReportSummary(CancellationToken cancellationToken)
    {
        try
        {
            var report = await _service.GetReportSummaryAsync(cancellationToken);
            return Ok(report);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    private bool TryGetAdminUserId(out int userId)
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(val, out userId) && userId > 0;
    }
}
