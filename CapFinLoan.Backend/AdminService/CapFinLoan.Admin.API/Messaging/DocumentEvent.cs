namespace CapFinLoan.Admin.API.Messaging;

public sealed class DocumentEvent
{
    public string? EventType { get; set; }
    public int DocumentId { get; set; }
    public int ApplicationId { get; set; }
    public int UserId { get; set; }
    public string? DocumentType { get; set; }
    public string? FileName { get; set; }
    public string? PreviousStatus { get; set; }
    public string? CurrentStatus { get; set; }
    public DateTime OccurredAtUtc { get; set; }
}
