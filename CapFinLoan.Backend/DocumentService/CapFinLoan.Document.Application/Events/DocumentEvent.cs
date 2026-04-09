namespace CapFinLoan.Document.Application.Events;

public sealed class DocumentEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public string EventType { get; init; } = string.Empty;
    public int DocumentId { get; init; }
    public int ApplicationId { get; init; }
    public int UserId { get; init; }
    public string DocumentType { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
    public string CurrentStatus { get; init; } = string.Empty;
    public string? PreviousStatus { get; init; }
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;
}
