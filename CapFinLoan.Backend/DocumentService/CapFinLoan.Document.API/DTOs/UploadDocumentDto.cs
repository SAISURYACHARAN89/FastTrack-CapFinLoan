using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Document.API.DTOs;

public sealed class UploadDocumentDto
{
    [Required]
    public int ApplicationId { get; init; }

    [Required]
    public IFormFile? File { get; init; }
}
