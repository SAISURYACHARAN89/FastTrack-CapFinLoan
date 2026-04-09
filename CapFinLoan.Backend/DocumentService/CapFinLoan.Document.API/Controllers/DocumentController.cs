using System.Security.Claims;
using CapFinLoan.Document.API.DTOs;
using CapFinLoan.Document.Application.DTOs;
using CapFinLoan.Document.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Document.API.Controllers;

[ApiController]
[Route("documents")]
[Authorize]
public sealed class DocumentController : ControllerBase
{
    private const long RequestLimitBytes = 6L * 1024L * 1024L;
    private readonly DocumentService _service;

    public DocumentController(DocumentService service)
    {
        _service = service;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(RequestLimitBytes)]
    public async Task<ActionResult<DocumentDto>> Upload([FromForm] UploadDocumentDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (dto.File == null)
            return BadRequest(new { message = "File is required." });

        if (string.IsNullOrWhiteSpace(dto.DocumentType))
            return BadRequest(new { message = "DocumentType is required (e.g., 'PAN', 'ITR')." });

        try
        {
            await using var stream = dto.File.OpenReadStream();
            var safeFileName = Path.GetFileName(dto.File.FileName);

            var created = await _service.UploadAsync(
                userId,
                dto.ApplicationId,
                safeFileName,
                dto.File.ContentType,
                dto.File.Length,
                dto.DocumentType,
                stream,
                cancellationToken);

            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [RequestSizeLimit(RequestLimitBytes)]
    public async Task<ActionResult<DocumentDto>> Replace([FromRoute] int id, [FromForm] ReplaceDocumentDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (dto.File == null)
            return BadRequest(new { message = "File is required." });

        try
        {
            await using var stream = dto.File.OpenReadStream();
            var safeFileName = Path.GetFileName(dto.File.FileName);

            var updated = await _service.ReplaceAsync(
                userId,
                id,
                safeFileName,
                dto.File.ContentType,
                dto.File.Length,
                stream,
                cancellationToken);

            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("application/{applicationId:int}")]
    public async Task<ActionResult<IReadOnlyList<DocumentDto>>> GetByApplication(
        [FromRoute] int applicationId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("ADMIN");
        var docs = await _service.GetByApplicationAsync(userId, applicationId, isAdmin, cancellationToken);
        return Ok(docs);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var deleted = await _service.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>Admin or owner — streams the raw file to the client.</summary>
    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("ADMIN");
        var result = await _service.DownloadAsync(userId, id, isAdmin, cancellationToken);

        if (result == null)
            return NotFound(new { message = $"Document {id} not found or access denied." });

        var (stream, contentType, fileName) = result.Value;
        var safeFileName = Uri.EscapeDataString(fileName);
        Response.Headers.Append("Content-Disposition", $"inline; filename*=UTF-8''{safeFileName}");
        return File(stream, contentType, enableRangeProcessing: true);
    }

    /// <summary>
    /// Admin-only — updates a document's verification status (VERIFIED or REJECTED).
    /// Called internally by AdminService when an admin verifies a document.
    /// </summary>
    [HttpPut("{id:int}/verify-status")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> VerifyStatus(
        [FromRoute] int id,
        [FromBody] VerifyStatusDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateStatusAsync(id, dto.Status, cancellationToken);
            return updated
                ? Ok(new { message = $"Document {id} status updated to {dto.Status}." })
                : NotFound(new { message = $"Document {id} not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private bool TryGetUserId(out int userId)
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(val, out userId) && userId > 0;
    }
}
