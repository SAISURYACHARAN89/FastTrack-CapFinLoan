namespace CapFinLoan.Application.API.Messaging;

public sealed class AdminDecisionMadeEvent
{
    public Guid EventId { get; init; }
    public int ApplicationId { get; init; }
    public int AdminUserId { get; init; }
    public string Decision { get; init; } = string.Empty;
    public string? Remarks { get; init; }
    public decimal? ApprovedAmount { get; init; }
    public int? TenureMonths { get; init; }
    public decimal? InterestRate { get; init; }
    public DateTime OccurredAtUtc { get; init; }
}
