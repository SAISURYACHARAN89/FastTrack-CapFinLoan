namespace CapFinLoan.Auth.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed class VerifySignupOtpDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [RegularExpression("^[0-9]{6}$")]
    public string Otp { get; set; } = "";
}
