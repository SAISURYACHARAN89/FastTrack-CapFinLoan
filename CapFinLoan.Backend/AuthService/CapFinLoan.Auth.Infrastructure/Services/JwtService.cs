using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CapFinLoan.Auth.Application.Interfaces;
using CapFinLoan.Auth.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CapFinLoan.Auth.Infrastructure.Services;

public sealed class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var key = _configuration["Jwt:Key"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("JWT Key is not configured (Jwt:Key).");
        if (string.IsNullOrWhiteSpace(issuer))
            throw new InvalidOperationException("JWT Issuer is not configured (Jwt:Issuer).");
        if (string.IsNullOrWhiteSpace(audience))
            throw new InvalidOperationException("JWT Audience is not configured (Jwt:Audience).");

        if (Encoding.UTF8.GetByteCount(key) < 32)
            throw new InvalidOperationException("JWT Key is too short for HS256. Use at least 32 bytes (256 bits) for Jwt:Key.");

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(60);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: creds);

        var token = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
        return (token, expiresAtUtc);
    }
}
