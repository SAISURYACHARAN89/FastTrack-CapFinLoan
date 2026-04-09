using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Document.Domain.Entities;

public sealed class Document
{
    public int Id { get; set; }

    [Required]
    public int ApplicationId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string StoredFileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    public long FileSize { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";

    [Required]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(50)]
    public string DocumentType { get; set; } = string.Empty;
}
