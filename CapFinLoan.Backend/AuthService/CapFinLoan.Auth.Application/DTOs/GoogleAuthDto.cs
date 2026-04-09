namespace CapFinLoan.Auth.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed class GoogleAuthDto
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
