using CapFinLoan.Auth.Application.DTOs;

namespace CapFinLoan.Auth.Application.Interfaces;

public interface IGoogleTokenValidator
{
    Task<GoogleUserInfoDto?> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
