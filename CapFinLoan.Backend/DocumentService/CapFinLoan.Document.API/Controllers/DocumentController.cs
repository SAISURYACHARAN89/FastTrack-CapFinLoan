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
    private const long RequestLimitBytes = 6L * 1024L * 1024L; // small overhead beyond 5MB
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
                stream,
                cancellationToken);

            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("application/{applicationId:int}")]
    public async Task<ActionResult<IReadOnlyList<DocumentDto>>> GetByApplication([FromRoute] int applicationId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        var docs = await _service.GetByApplicationAsync(userId, applicationId, cancellationToken);
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

    private bool TryGetUserId(out int userId)
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(val, out userId) && userId > 0;
    }
}
