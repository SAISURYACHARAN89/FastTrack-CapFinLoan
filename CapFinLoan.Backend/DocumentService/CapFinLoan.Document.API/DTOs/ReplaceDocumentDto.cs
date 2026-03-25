using Microsoft.AspNetCore.Http;

namespace CapFinLoan.Document.API.DTOs;

public sealed class ReplaceDocumentDto
{
    public IFormFile? File { get; set; }
}
