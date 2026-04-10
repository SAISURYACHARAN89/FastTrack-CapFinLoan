using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace CapFinLoan.Auth.Infrastructure.Services;

public sealed class SignupOtpService : ISignupOtpService
{
    private static readonly TimeSpan VerificationTokenTtlGrace = TimeSpan.FromSeconds(5);

    private readonly IMemoryCache _cache;
    private readonly SignupOtpOptions _otpOptions;
    private readonly SmtpOptions _smtpOptions;

    public SignupOtpService(
        IMemoryCache cache,
        IOptions<SignupOtpOptions> otpOptions,
        IOptions<SmtpOptions> smtpOptions)
    {
        _cache = cache;
        _otpOptions = otpOptions.Value;
        _smtpOptions = smtpOptions.Value;
    }

    public async Task RequestOtpAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var cooldownKey = $"signup:otp:cooldown:{normalizedEmail}";

        if (_cache.TryGetValue(cooldownKey, out _))
            return;

        var otp = GenerateNumericOtp(_otpOptions.OtpLength);
        var otpExpiresAtUtc = DateTime.UtcNow.AddMinutes(_otpOptions.OtpTtlMinutes);

        _cache.Set(
            $"signup:otp:value:{normalizedEmail}",
            otp,
            otpExpiresAtUtc);

        _cache.Set(
            cooldownKey,
            true,
            TimeSpan.FromSeconds(_otpOptions.CooldownSeconds));

        await SendOtpEmailAsync(normalizedEmail, otp, otpExpiresAtUtc, cancellationToken);
    }

    public Task<SignupOtpVerificationDto?> VerifyOtpAsync(string email, string otp, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var otpKey = $"signup:otp:value:{normalizedEmail}";

        if (!_cache.TryGetValue<string>(otpKey, out var savedOtp) || string.IsNullOrWhiteSpace(savedOtp))
            return Task.FromResult<SignupOtpVerificationDto?>(null);

        if (!string.Equals(savedOtp, otp.Trim(), StringComparison.Ordinal))
            return Task.FromResult<SignupOtpVerificationDto?>(null);

        _cache.Remove(otpKey);

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_otpOptions.VerificationTokenTtlMinutes);

        _cache.Set(
            $"signup:otp:verified:{normalizedEmail}",
            token,
            expiresAtUtc.Add(VerificationTokenTtlGrace));

        return Task.FromResult<SignupOtpVerificationDto?>(new SignupOtpVerificationDto
        {
            VerificationToken = token,
            ExpiresAtUtc = expiresAtUtc
        });
    }

    public bool ConsumeVerificationToken(string email, string verificationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var key = $"signup:otp:verified:{normalizedEmail}";

        if (!_cache.TryGetValue<string>(key, out var savedToken) || string.IsNullOrWhiteSpace(savedToken))
            return false;

        if (!string.Equals(savedToken, verificationToken.Trim(), StringComparison.Ordinal))
            return false;

        _cache.Remove(key);
        return true;
    }

    private async Task SendOtpEmailAsync(string toEmail, string otp, DateTime otpExpiresAtUtc, CancellationToken cancellationToken)
    {
        ValidateSmtpConfiguration();

        using var mail = new MailMessage
        {
            From = new MailAddress(_otpOptions.EmailFrom, _otpOptions.EmailFromName),
            Subject = _otpOptions.EmailSubject,
            Body = BuildHtmlOtpEmailBody(otp, otpExpiresAtUtc),
            IsBodyHtml = true
        };

        mail.To.Add(new MailAddress(toEmail));

        using var smtp = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            EnableSsl = _smtpOptions.EnableSsl,
            Credentials = new NetworkCredential(_smtpOptions.Username, _smtpOptions.Password)
        };

        cancellationToken.ThrowIfCancellationRequested();
        await smtp.SendMailAsync(mail);
    }

    private string BuildHtmlOtpEmailBody(string otp, DateTime otpExpiresAtUtc)
    {
        var encodedOtp = WebUtility.HtmlEncode(otp);
        var encodedExpiry = WebUtility.HtmlEncode(otpExpiresAtUtc.ToString("dd MMM yyyy, hh:mm tt 'UTC'"));

        return $"""
<!doctype html>
<html lang=\"en\">
    <body style=\"margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#17212b;\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px;\">
            <tr>
                <td align=\"center\">
                    <table role=\"presentation\" width=\"600\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#ffffff;border:1px solid #dbe6f3;border-radius:14px;overflow:hidden;\">
                        <tr>
                            <td style=\"padding:20px 24px;background:linear-gradient(135deg,#0f1f39,#1f3d6e);color:#ffffff;\">
                                <h1 style=\"margin:0;font-size:22px;letter-spacing:0.3px;\">CapFinLoan</h1>
                                <p style=\"margin:8px 0 0 0;font-size:13px;opacity:0.9;\">Secure Email Verification</p>
                            </td>
                        </tr>
                        <tr>
                            <td style=\"padding:24px;\">
                                <p style=\"margin:0 0 14px 0;font-size:15px;line-height:1.6;\">Use the OTP below to complete your signup.</p>
                                <div style=\"margin:10px 0 18px 0;padding:16px;border:1px dashed #9db5d4;border-radius:10px;background:#f7fbff;text-align:center;\">
                                    <p style=\"margin:0 0 8px 0;font-size:12px;letter-spacing:0.08em;color:#4f6178;text-transform:uppercase;\">One-Time Password</p>
                                    <p style=\"margin:0;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#0f1f39;\">{encodedOtp}</p>
                                </div>
                                <p style=\"margin:0 0 8px 0;font-size:13px;color:#4f6178;\">This code expires at <strong>{encodedExpiry}</strong>.</p>
                                <p style=\"margin:0;font-size:13px;color:#4f6178;\">If you did not request this, you can safely ignore this email.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
""";
    }

    private void ValidateSmtpConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_otpOptions.EmailFrom))
            throw new InvalidOperationException("SignupOtp:EmailFrom is not configured.");

        if (string.IsNullOrWhiteSpace(_smtpOptions.Host))
            throw new InvalidOperationException("Smtp:Host is not configured.");

        if (_smtpOptions.Port <= 0)
            throw new InvalidOperationException("Smtp:Port must be greater than zero.");

        if (string.IsNullOrWhiteSpace(_smtpOptions.Username))
            throw new InvalidOperationException("Smtp:Username is not configured.");

        if (string.IsNullOrWhiteSpace(_smtpOptions.Password))
            throw new InvalidOperationException("Smtp:Password is not configured.");
    }

    private static string GenerateNumericOtp(int length)
    {
        if (length < 4)
            length = 6;

        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = (char)('0' + RandomNumberGenerator.GetInt32(0, 10));
        }

        return new string(chars);
    }
}
