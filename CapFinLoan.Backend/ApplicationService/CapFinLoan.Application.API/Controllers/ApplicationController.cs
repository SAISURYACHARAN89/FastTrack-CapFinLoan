using System.Security.Claims;
using System.Text.Json;
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
    private readonly IHttpClientFactory _httpClientFactory;

    public ApplicationController(ApplicationService service, IHttpClientFactory httpClientFactory)
    {
        _service = service;
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost]
    public async Task<ActionResult<ApplicationDto>> Create([FromBody] CreateApplicationDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var authHeader = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(authHeader))
            return Unauthorized(new { message = "Missing authorization token." });

        var profileCheck = await IsProfileCompleteAsync(authHeader, cancellationToken);
        if (!profileCheck.Success)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Unable to validate profile status. Please try again." });

        if (!profileCheck.IsProfileComplete)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Finish setting up your profile before creating an application." });

        var created = await _service.CreateAsync(userId, dto, cancellationToken);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApplicationDto>> Update([FromRoute] int id, [FromBody] CreateApplicationDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var updated = await _service.UpdateAsync(userId, id, dto, cancellationToken);
        if (updated == null)
            return NotFound();

        return Ok(updated);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApplicationDto>> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var isAdmin = User.IsInRole("ADMIN");
        ApplicationDto? app;

        if (isAdmin)
            app = await _service.GetByIdAsAdminAsync(id, cancellationToken);
        else
            app = await _service.GetByIdAsync(userId, id, cancellationToken);

        if (app == null)
            return NotFound();

        return Ok(app);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<ActionResult<ApplicationDto>> Submit([FromRoute] int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var submitted = await _service.SubmitAsync(userId, id, cancellationToken);
        if (submitted == null)
            return NotFound();

        return Ok(submitted);
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
        var updated = await _service.SetStatusAsAdminAsync(id, dto.Status, dto.Reason, cancellationToken);
        return updated == null ? NotFound() : Ok(updated);
    }

    private int GetUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !int.TryParse(userIdValue, out var userId))
            throw new UnauthorizedAccessException("Invalid or missing user id claim.");

        return userId;
    }

    private async Task<(bool Success, bool IsProfileComplete)> IsProfileCompleteAsync(string authHeader, CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("AuthService");
            using var request = new HttpRequestMessage(HttpMethod.Get, "/auth/me");
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);

            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return (false, false);

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<AuthMeResponse>(
                stream,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken: cancellationToken);
            return (true, payload?.IsProfileComplete == true);
        }
        catch
        {
            return (false, false);
        }
    }

    private sealed class AuthMeResponse
    {
        public bool IsProfileComplete { get; set; }
    }
}
