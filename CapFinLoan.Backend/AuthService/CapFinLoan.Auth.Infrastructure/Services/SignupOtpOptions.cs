namespace CapFinLoan.Auth.Infrastructure.Services;

public sealed class SignupOtpOptions
{
    public int OtpLength { get; set; } = 6;
    public int OtpTtlMinutes { get; set; } = 10;
    public int VerificationTokenTtlMinutes { get; set; } = 15;
    public int CooldownSeconds { get; set; } = 30;
    public string EmailFrom { get; set; } = string.Empty;
}
