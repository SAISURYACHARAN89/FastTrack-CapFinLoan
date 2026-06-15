using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Auth.Application.DTOs;

public class ResetPasswordDto
{
    [Required]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string VerificationToken { get; set; } = string.Empty;

    [Required]
    public string NewPassword { get; set; } = string.Empty;
}
