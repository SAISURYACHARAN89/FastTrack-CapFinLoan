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
            From = new MailAddress(_otpOptions.EmailFrom),
            Subject = "CapFinLoan Signup OTP",
            Body = $"Your CapFinLoan signup OTP is {otp}. It expires at {otpExpiresAtUtc:yyyy-MM-dd HH:mm:ss} UTC.",
            IsBodyHtml = false
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
