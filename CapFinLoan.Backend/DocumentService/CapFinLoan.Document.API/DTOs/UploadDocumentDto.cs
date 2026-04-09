using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Document.API.DTOs;

public sealed class UploadDocumentDto
{
    [Required]
    public int ApplicationId { get; init; }

    [Required]
    public IFormFile? File { get; init; }

    [Required]
    [MaxLength(50)]
    public string DocumentType { get; init; } = string.Empty;
}
