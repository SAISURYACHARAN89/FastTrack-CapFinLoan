using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Application.Domain.Entities;

public class LoanApplication
{
    public int Id { get; set; }

    public int UserId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Range(1, 600)]
    public int TenureMonths { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "PENDING";

    [MaxLength(500)]
    public string? DecisionReason { get; set; }

    public DateTime? DecidedAtUtc { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
