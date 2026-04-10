namespace CapFinLoan.Auth.Application.DTOs;

public sealed class UserIdentifierDto
{
    public int UserId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? MobileNumber { get; init; }
    public string? BankName { get; init; }
    public string? EmploymentStatus { get; init; }
}
