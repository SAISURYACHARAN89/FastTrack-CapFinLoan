using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Admin.Application.DTOs;

public class VerifyDocumentRequestDto
{
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // VERIFIED, REJECTED

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
