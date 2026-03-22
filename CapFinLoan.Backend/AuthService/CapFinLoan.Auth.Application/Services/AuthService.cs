using CapFinLoan.Auth.Domain.Entities;
using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Exceptions;
using CapFinLoan.Auth.Application.Interfaces;
using BCrypt.Net;

namespace CapFinLoan.Auth.Application.Services;

public class AuthService
{
    private const int PasswordWorkFactor = 12;

    private readonly IUserRepository _users;
    private readonly IJwtService _jwt;

    public AuthService(IUserRepository users, IJwtService jwt)
    {
        _users = users;
        _jwt = jwt;
    }

    public async Task<UserDto> SignupAsync(SignupDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var existing = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (existing != null)
            throw new EmailAlreadyExistsException(normalizedEmail);

        var user = new User
        {
            Name = dto.Name,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: PasswordWorkFactor),
            Role = "APPLICANT"
        };

        await _users.AddAsync(user, cancellationToken);
        await _users.SaveChangesAsync(cancellationToken);

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive
        };
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailForUpdateAsync(normalizedEmail, cancellationToken);

        if (user == null || user.IsActive == false)
            return null;

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            return null;

        var isBcryptHash = user.PasswordHash.StartsWith("$2", StringComparison.Ordinal);

        var isValid = isBcryptHash
            ? BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash)
            : user.PasswordHash == dto.Password;

        if (!isValid)
            return null;

        if (!isBcryptHash)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: PasswordWorkFactor);
            await _users.SaveChangesAsync(cancellationToken);
        }

        var (token, expiresAtUtc) = _jwt.CreateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role
        };
    }
}