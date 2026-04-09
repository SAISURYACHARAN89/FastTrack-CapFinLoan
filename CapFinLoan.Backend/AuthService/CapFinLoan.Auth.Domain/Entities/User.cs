namespace CapFinLoan.Auth.Domain.Entities;

using System.ComponentModel.DataAnnotations;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = "APPLICANT";

    public bool IsActive { get; set; } = true;

    [MaxLength(20)]
    public string? MobileNumber { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(50)]
    public string? EmploymentStatus { get; set; }

    [MaxLength(100)]
    public string? BankName { get; set; }

    [MaxLength(30)]
    public string? BankAccountNumber { get; set; }

    [MaxLength(20)]
    public string? IfscCode { get; set; }

    public decimal? AnnualIncome { get; set; }

    public string? ProfilePhotoDataUrl { get; set; }
}