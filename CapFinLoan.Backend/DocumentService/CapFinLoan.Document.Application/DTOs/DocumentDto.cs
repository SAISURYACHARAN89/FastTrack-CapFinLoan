namespace CapFinLoan.Document.Application.DTOs;

public sealed class DocumentDto
{
    public int Id { get; init; }
    public int ApplicationId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTime UploadedAt { get; init; }
}
