namespace CapFinLoan.Auth.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public class SignupDto
{
    [Required]
    [MinLength(2)]
    public string Name { get; set; } = "";

    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = "";

    [Required]
    public string OtpVerificationToken { get; set; } = "";
}