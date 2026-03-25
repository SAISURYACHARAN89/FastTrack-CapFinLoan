using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Admin.Domain.Entities;

public sealed class AdminDecision
{
    public int Id { get; set; }

    [Required]
    public int ApplicationId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Decision { get; set; } = string.Empty; // APPROVED, REJECTED, UNDER_REVIEW

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Range(0, double.MaxValue)]
    public decimal ApprovedAmount { get; set; }

    [Range(1, 600)]
    public int TenureMonths { get; set; }

    [Range(0, 100)]
    public decimal InterestRate { get; set; }

    [Required]
    public int CreatedBy { get; set; }

    [Required]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
