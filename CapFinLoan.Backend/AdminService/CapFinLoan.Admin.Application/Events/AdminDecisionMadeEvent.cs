namespace CapFinLoan.Admin.Application.Events;

public sealed class AdminDecisionMadeEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public int ApplicationId { get; init; }
    public int AdminUserId { get; init; }
    public string Decision { get; init; } = string.Empty;
    public string? Remarks { get; init; }
    public decimal? ApprovedAmount { get; init; }
    public int? TenureMonths { get; init; }
    public decimal? InterestRate { get; init; }
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;
}
