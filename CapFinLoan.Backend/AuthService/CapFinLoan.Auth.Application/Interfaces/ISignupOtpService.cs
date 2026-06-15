namespace CapFinLoan.Auth.Application.Interfaces;

using CapFinLoan.Auth.Application.DTOs;

public interface IOtpService
{
    Task RequestOtpAsync(string email, string purpose, CancellationToken cancellationToken = default);
    Task<SignupOtpVerificationDto?> VerifyOtpAsync(string email, string otp, string purpose, CancellationToken cancellationToken = default);
    bool ConsumeVerificationToken(string email, string verificationToken, string purpose);
    Task RemoveOtpAsync(string email, string purpose, CancellationToken cancellationToken = default);
}
