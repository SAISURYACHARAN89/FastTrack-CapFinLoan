namespace CapFinLoan.Auth.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed class RequestSignupOtpDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
}
