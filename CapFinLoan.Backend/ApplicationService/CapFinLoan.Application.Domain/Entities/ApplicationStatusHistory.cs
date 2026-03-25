using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Application.Domain.Entities;

public sealed class ApplicationStatusHistory
{
    public int Id { get; set; }

    [Required]
    public int ApplicationId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;

    [Required]
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? Note { get; set; }
}
