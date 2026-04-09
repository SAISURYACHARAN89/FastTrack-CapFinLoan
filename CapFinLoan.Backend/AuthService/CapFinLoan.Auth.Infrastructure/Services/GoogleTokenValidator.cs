using CapFinLoan.Auth.Application.DTOs;
using CapFinLoan.Auth.Application.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace CapFinLoan.Auth.Infrastructure.Services;

public sealed class GoogleTokenValidator : IGoogleTokenValidator
{
    private readonly GoogleAuthOptions _options;

    public GoogleTokenValidator(IOptions<GoogleAuthOptions> options)
    {
        _options = options.Value;
    }

    public async Task<GoogleUserInfoDto?> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken) || string.IsNullOrWhiteSpace(_options.ClientId))
            return null;

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                idToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _options.ClientId }
                });

            if (string.IsNullOrWhiteSpace(payload.Email))
                return null;

            return new GoogleUserInfoDto
            {
                Email = payload.Email,
                Name = payload.Name ?? string.Empty
            };
        }
        catch
        {
            return null;
        }
    }
}
