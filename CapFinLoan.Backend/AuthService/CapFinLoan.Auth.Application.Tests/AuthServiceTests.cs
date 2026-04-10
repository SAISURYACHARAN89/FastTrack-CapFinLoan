using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Exceptions;
using CapFinLoan.Auth.Application.Interfaces;
using CapFinLoan.Auth.Application.Services;
using CapFinLoan.Auth.Domain.Entities;
using Moq;

namespace CapFinLoan.Auth.Application.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _mockUserRepo;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<ISignupOtpService> _mockSignupOtpService;
    private readonly Mock<IGoogleTokenValidator> _mockGoogleTokenValidator;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _mockUserRepo = new Mock<IUserRepository>();
        _mockJwtService = new Mock<IJwtService>();
        _mockSignupOtpService = new Mock<ISignupOtpService>();
        _mockGoogleTokenValidator = new Mock<IGoogleTokenValidator>();

        _authService = new AuthService(
            _mockUserRepo.Object,
            _mockJwtService.Object,
            _mockSignupOtpService.Object,
            _mockGoogleTokenValidator.Object);
    }

    [Fact]
    public async Task SignupAsync_WithValidData_CreatesUser()
    {
        // Arrange
        var dto = new SignupDto
        {
            Name = "Test User",
            Email = "test@example.com",
            Password = "password123",
            OtpVerificationToken = "valid_token"
        };

        _mockSignupOtpService
            .Setup(s => s.ConsumeVerificationToken(dto.Email.ToLowerInvariant(), dto.OtpVerificationToken))
            .Returns(true);

        _mockUserRepo
            .Setup(r => r.GetByEmailAsync(dto.Email.ToLowerInvariant(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _authService.SignupAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(dto.Name, result.Name);
        Assert.Equal(dto.Email.ToLowerInvariant(), result.Email);

        _mockUserRepo.Verify(
            r => r.AddAsync(It.Is<User>(u =>
                u.Name == dto.Name &&
                u.Email == dto.Email.ToLowerInvariant() &&
                u.Role == "APPLICANT"),
            It.IsAny<CancellationToken>()),
            Times.Once);

        _mockUserRepo.Verify(
            r => r.SaveChangesAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SignupAsync_WithExistingEmail_ThrowsEmailAlreadyExistsException()
    {
        // Arrange
        var dto = new SignupDto
        {
            Name = "Test User",
            Email = "test@example.com",
            Password = "password123",
            OtpVerificationToken = "valid_token"
        };

        _mockSignupOtpService
            .Setup(s => s.ConsumeVerificationToken(dto.Email.ToLowerInvariant(), dto.OtpVerificationToken))
            .Returns(true);

        _mockUserRepo
            .Setup(r => r.GetByEmailAsync(dto.Email.ToLowerInvariant(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User());

        // Act & Assert
        await Assert.ThrowsAsync<EmailAlreadyExistsException>(() => _authService.SignupAsync(dto));
    }

    [Fact]
    public async Task SignupAsync_WithInvalidOtp_ThrowsInvalidSignupOtpVerificationException()
    {
        // Arrange
        var dto = new SignupDto
        {
            Name = "Test User",
            Email = "test@example.com",
            Password = "password123",
            OtpVerificationToken = "invalid_token"
        };

        _mockSignupOtpService
            .Setup(s => s.ConsumeVerificationToken(dto.Email.ToLowerInvariant(), dto.OtpVerificationToken))
            .Returns(false);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidSignupOtpVerificationException>(() => _authService.SignupAsync(dto));
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";
        var user = new User
        {
            Id = 1,
            Name = "Test User",
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "APPLICANT",
            IsActive = true
        };
        var token = "jwt_token";
        var expires = DateTime.UtcNow.AddHours(1);

        _mockUserRepo
            .Setup(r => r.GetByEmailForUpdateAsync(email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _mockJwtService
            .Setup(j => j.CreateToken(user))
            .Returns((token, expires));

        // Act
        var result = await _authService.LoginAsync(new LoginDto { Email = email, Password = password });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(token, result.Token);
        Assert.Equal(user.Id, result.UserId);
        Assert.Equal(user.Name, result.Name);
        Assert.Equal(user.Email, result.Email);
        Assert.Equal(user.Role, result.Role);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ReturnsNull()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";
        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("wrong_password"),
            IsActive = true
        };

        _mockUserRepo
            .Setup(r => r.GetByEmailForUpdateAsync(email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _authService.LoginAsync(new LoginDto { Email = email, Password = password });

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WithNonExistentUser_ReturnsNull()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";

        _mockUserRepo
            .Setup(r => r.GetByEmailForUpdateAsync(email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User)null);

        // Act
        var result = await _authService.LoginAsync(new LoginDto { Email = email, Password = password });

        // Assert
        Assert.Null(result);
    }
}
