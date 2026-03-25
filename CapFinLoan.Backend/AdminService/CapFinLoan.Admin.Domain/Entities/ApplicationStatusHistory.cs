using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Admin.Domain.Entities;

public sealed class ApplicationStatusHistory
{
    public int Id { get; set; }

    [Required]
    public int ApplicationId { get; set; }

    [Required]
    [MaxLength(50)]
    public string OldStatus { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NewStatus { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Required]
    public int ChangedBy { get; set; }

    [Required]
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
}
