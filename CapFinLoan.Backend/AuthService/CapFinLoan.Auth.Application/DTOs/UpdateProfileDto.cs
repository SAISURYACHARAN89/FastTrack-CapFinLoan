using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Auth.Application.DTOs;

public sealed class UpdateProfileDto
{
    [Required]
    [MaxLength(20)]
    public string MobileNumber { get; init; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Address { get; init; } = string.Empty;

    [Required]
    public DateTime DateOfBirth { get; init; }

    [Required]
    [MaxLength(50)]
    public string EmploymentStatus { get; init; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string BankName { get; init; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string BankAccountNumber { get; init; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string IfscCode { get; init; } = string.Empty;

    [Required]
    [Range(1, 1000000000000)]
    public decimal AnnualIncome { get; init; }

    [Required]
    public string ProfilePhotoDataUrl { get; init; } = string.Empty;
}
