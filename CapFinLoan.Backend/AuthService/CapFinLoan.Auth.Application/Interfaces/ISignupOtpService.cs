namespace CapFinLoan.Auth.Application.Interfaces;

using CapFinLoan.Auth.Application.DTOs;

public interface ISignupOtpService
{
    Task RequestOtpAsync(string email, CancellationToken cancellationToken = default);
    Task<SignupOtpVerificationDto?> VerifyOtpAsync(string email, string otp, CancellationToken cancellationToken = default);
    bool ConsumeVerificationToken(string email, string verificationToken);
}
