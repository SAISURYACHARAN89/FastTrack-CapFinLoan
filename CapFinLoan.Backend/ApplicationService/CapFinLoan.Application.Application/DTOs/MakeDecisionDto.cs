using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Application.Application.DTOs;

public sealed class MakeDecisionDto
{
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // e.g. UNDER_REVIEW / APPROVED / REJECTED

    [MaxLength(500)]
    public string? Reason { get; set; }
}
