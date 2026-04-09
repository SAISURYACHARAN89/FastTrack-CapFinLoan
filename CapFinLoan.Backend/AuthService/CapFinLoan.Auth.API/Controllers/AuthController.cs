using Microsoft.AspNetCore.Mvc;
using CapFinLoan.Auth.Application.Services;
using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Exceptions;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CapFinLoan.Auth.API.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _service;

    public AuthController(AuthService service)
    {
        _service = service;
    }

    [HttpPost("signup")]
    public async Task<ActionResult<UserDto>> Signup([FromBody] SignupDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _service.SignupAsync(dto, cancellationToken);
            return Ok(user);
        }
        catch (EmailAlreadyExistsException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
    {
        var auth = await _service.LoginAsync(dto, cancellationToken);

        if (auth == null)
            return Unauthorized();

        return Ok(auth);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var profile = await _service.GetProfileAsync(userId, cancellationToken);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var profile = await _service.UpdateProfileAsync(userId, dto, cancellationToken);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpGet("users/identifiers")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IReadOnlyList<UserIdentifierDto>>> GetUserIdentifiers([FromQuery] int[] ids, CancellationToken cancellationToken)
    {
        var distinctIds = ids.Where(x => x > 0).Distinct().ToArray();
        if (distinctIds.Length == 0)
            return Ok(Array.Empty<UserIdentifierDto>());

        var users = await _service.GetUserIdentifiersAsync(distinctIds, cancellationToken);
        return Ok(users);
    }

    private int GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
            throw new UnauthorizedAccessException("Invalid or missing user id claim.");

        return userId;
    }
}