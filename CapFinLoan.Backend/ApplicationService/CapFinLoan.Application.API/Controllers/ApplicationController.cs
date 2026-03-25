using System.Security.Claims;
using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CapFinLoan.Application.API.Controllers;

[ApiController]
[Route("applications")]
[Authorize]
public sealed class ApplicationController : ControllerBase
{
    private readonly ApplicationService _service;

    public ApplicationController(ApplicationService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<ActionResult<ApplicationDto>> Create([FromBody] CreateApplicationDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var created = await _service.CreateAsync(userId, dto, cancellationToken);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApplicationDto>> Update([FromRoute] int id, [FromBody] CreateApplicationDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        try
        {
            var updated = await _service.UpdateAsync(userId, id, dto, cancellationToken);
            if (updated == null)
                return NotFound();

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApplicationDto>> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var app = await _service.GetByIdAsync(userId, id, cancellationToken);
        if (app == null)
            return NotFound();

        return Ok(app);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<ActionResult<ApplicationDto>> Submit([FromRoute] int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        try
        {
            var submitted = await _service.SubmitAsync(userId, id, cancellationToken);
            if (submitted == null)
                return NotFound();

            return Ok(submitted);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<ApplicationDto>>> My(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var apps = await _service.GetMyApplicationsAsync(userId, cancellationToken);
        return Ok(apps);
    }

    [HttpGet("queue")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IReadOnlyList<ApplicationDto>>> Queue(CancellationToken cancellationToken)
    {
        var apps = await _service.GetAllApplicationsAsync(cancellationToken);
        return Ok(apps);
    }

    [HttpGet("{id:int}/timeline")]
    public async Task<ActionResult<IReadOnlyList<ApplicationStatusHistoryDto>>> Timeline([FromRoute] int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var timeline = await _service.GetTimelineAsync(userId, id, cancellationToken);
        return timeline == null ? NotFound() : Ok(timeline);
    }

    [HttpPost("{id:int}/status")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<ApplicationDto>> SetStatusAsAdmin([FromRoute] int id, [FromBody] MakeDecisionDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.SetStatusAsAdminAsync(id, dto.Status, dto.Reason, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    private int GetUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !int.TryParse(userIdValue, out var userId))
            throw new UnauthorizedAccessException("Invalid or missing user id claim.");

        return userId;
    }
}
