using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Application.Domain.Entities;

public sealed class ApplicationSubmissionSaga
{
    public int Id { get; set; }

    [Required]
    public Guid SagaId { get; set; } = Guid.NewGuid();

    [Required]
    public int ApplicationId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string State { get; set; } = "STARTED";

    public bool IsCompleted { get; set; }

    public bool IsCompensated { get; set; }

    [MaxLength(1000)]
    public string? LastError { get; set; }

    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAtUtc { get; set; }
}
