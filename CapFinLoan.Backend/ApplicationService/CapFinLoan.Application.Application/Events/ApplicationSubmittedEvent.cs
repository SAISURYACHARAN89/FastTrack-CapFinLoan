namespace CapFinLoan.Application.Application.Events;

public sealed class ApplicationSubmittedEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public int ApplicationId { get; init; }
    public int UserId { get; init; }
    public decimal Amount { get; init; }
    public int TenureMonths { get; init; }
    public string PreviousStatus { get; init; } = string.Empty;
    public string NewStatus { get; init; } = "SUBMITTED";
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;
}
