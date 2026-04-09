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
    private readonly ISignupOtpService _signupOtp;
    private readonly IGoogleTokenValidator _googleTokenValidator;

    public AuthService(
        IUserRepository users,
        IJwtService jwt,
        ISignupOtpService signupOtp,
        IGoogleTokenValidator googleTokenValidator)
    {
        _users = users;
        _jwt = jwt;
        _signupOtp = signupOtp;
        _googleTokenValidator = googleTokenValidator;
    }

    public async Task<UserDto> SignupAsync(SignupDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var otpVerified = _signupOtp.ConsumeVerificationToken(normalizedEmail, dto.OtpVerificationToken);
        if (!otpVerified)
            throw new InvalidSignupOtpVerificationException();

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

        return Map(user);
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

    public async Task<AuthResponseDto?> GoogleAuthenticateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var googleUser = await _googleTokenValidator.ValidateIdTokenAsync(idToken, cancellationToken);
        if (googleUser == null)
            return null;

        var normalizedEmail = googleUser.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailForUpdateAsync(normalizedEmail, cancellationToken);

        if (user == null)
        {
            user = new User
            {
                Name = string.IsNullOrWhiteSpace(googleUser.Name)
                    ? normalizedEmail.Split('@')[0]
                    : googleUser.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), workFactor: PasswordWorkFactor),
                Role = "APPLICANT",
                IsActive = true
            };

            await _users.AddAsync(user, cancellationToken);
            await _users.SaveChangesAsync(cancellationToken);
        }

        if (!user.IsActive)
            return null;

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

    public async Task<UserDto?> GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return user == null ? null : Map(user);
    }

    public async Task<UserDto?> UpdateProfileAsync(int userId, UpdateProfileDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user == null)
            return null;

        user.MobileNumber = dto.MobileNumber.Trim();
        user.Address = dto.Address.Trim();
        user.DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth.Date, DateTimeKind.Utc);
        user.EmploymentStatus = dto.EmploymentStatus.Trim().ToUpperInvariant();
        user.BankName = dto.BankName.Trim();
        user.BankAccountNumber = dto.BankAccountNumber.Trim();
        user.IfscCode = dto.IfscCode.Trim().ToUpperInvariant();
        user.AnnualIncome = dto.AnnualIncome;
        user.ProfilePhotoDataUrl = dto.ProfilePhotoDataUrl.Trim();

        await _users.SaveChangesAsync(cancellationToken);
        return Map(user);
    }

    public async Task<IReadOnlyList<UserIdentifierDto>> GetUserIdentifiersAsync(IReadOnlyCollection<int> userIds, CancellationToken cancellationToken = default)
    {
        var users = await _users.GetByIdsAsync(userIds, cancellationToken);
        return users
            .Select(u => new UserIdentifierDto
            {
                UserId = u.Id,
                Name = u.Name,
                MobileNumber = u.MobileNumber,
                BankName = u.BankName,
                EmploymentStatus = u.EmploymentStatus
            })
            .ToArray();
    }

    private static UserDto Map(User user)
    {
        var isProfileComplete =
            !string.IsNullOrWhiteSpace(user.MobileNumber) &&
            !string.IsNullOrWhiteSpace(user.Address) &&
            user.DateOfBirth.HasValue &&
            !string.IsNullOrWhiteSpace(user.EmploymentStatus) &&
            !string.IsNullOrWhiteSpace(user.BankName) &&
            !string.IsNullOrWhiteSpace(user.BankAccountNumber) &&
            !string.IsNullOrWhiteSpace(user.IfscCode) &&
            user.AnnualIncome.HasValue &&
            user.AnnualIncome.Value > 0 &&
            !string.IsNullOrWhiteSpace(user.ProfilePhotoDataUrl);

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            MobileNumber = user.MobileNumber,
            Address = user.Address,
            DateOfBirth = user.DateOfBirth,
            EmploymentStatus = user.EmploymentStatus,
            BankName = user.BankName,
            BankAccountNumber = user.BankAccountNumber,
            IfscCode = user.IfscCode,
            AnnualIncome = user.AnnualIncome,
            ProfilePhotoDataUrl = user.ProfilePhotoDataUrl,
            IsProfileComplete = isProfileComplete
        };
    }
}