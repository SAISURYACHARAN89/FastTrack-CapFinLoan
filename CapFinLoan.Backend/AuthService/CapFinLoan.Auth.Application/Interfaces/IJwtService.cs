using CapFinLoan.Auth.Domain.Entities;

namespace CapFinLoan.Auth.Application.Interfaces;

public interface IJwtService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}
