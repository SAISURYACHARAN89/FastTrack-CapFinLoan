using CapFinLoan.Auth.Application.DTOs;

namespace CapFinLoan.Auth.Application.Interfaces;

public interface IAuthService
{
    Task<UserDto> SignupAsync(SignupDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto?> GoogleAuthenticateAsync(string idToken, CancellationToken cancellationToken = default);
    Task<UserDto?> GetProfileAsync(int userId, CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateProfileAsync(int userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserIdentifierDto>> GetUserIdentifiersAsync(IReadOnlyCollection<int> userIds, CancellationToken cancellationToken = default);

    // Forget Password Flow
    Task<bool> RequestPasswordResetOtpAsync(ForgotPasswordRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> VerifyPasswordResetOtpAsync(VerifyOtpRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(ResetPasswordDto request, CancellationToken cancellationToken = default);
}
