using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Admin.Application.DTOs;

public class MakeDecisionRequestDto
{
    [Required]
    [MaxLength(50)]
    public string Decision { get; set; } = string.Empty; // APPROVED, REJECTED, UNDER_REVIEW

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Range(0, double.MaxValue)]
    public decimal ApprovedAmount { get; set; } = 0;

    [Range(1, 600)]
    public int TenureMonths { get; set; } = 60;

    [Range(0, 100)]
    public decimal InterestRate { get; set; } = 0;
}
