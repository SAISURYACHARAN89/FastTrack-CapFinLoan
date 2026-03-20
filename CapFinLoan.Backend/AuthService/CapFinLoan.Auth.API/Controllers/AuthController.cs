using Microsoft.AspNetCore.Mvc;
using CapFinLoan.Auth.Application.Services;
using CapFinLoan.Auth.Application.DTOs;

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
    public IActionResult Signup(SignupDto dto)
    {
        var user = _service.Signup(dto);
        return Ok(user);
    }

    [HttpPost("login")]
    public IActionResult Login(LoginDto dto)
    {
        var user = _service.Login(dto);

        if (user == null)
            return Unauthorized();

        return Ok(user);
    }
}