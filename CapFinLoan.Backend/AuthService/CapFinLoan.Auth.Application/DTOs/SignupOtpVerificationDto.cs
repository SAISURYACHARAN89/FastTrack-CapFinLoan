namespace CapFinLoan.Auth.Application.DTOs;

public sealed class SignupOtpVerificationDto
{
    public string VerificationToken { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
}
