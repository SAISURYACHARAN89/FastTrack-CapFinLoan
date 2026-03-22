using Microsoft.AspNetCore.Mvc;
using CapFinLoan.Auth.Application.Services;
using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Exceptions;

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
}