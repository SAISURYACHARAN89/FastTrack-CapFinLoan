namespace CapFinLoan.Admin.Application.Interfaces;

public class ApplicationQueueSummary
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public int TenureMonths { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public int DocumentCount { get; set; }
}

/// <summary>
/// Read-only interface to fetch application queue and status from ApplicationService context.
/// In production, this would call external ApplicationService via HTTP; for now we'll simulate with DB context.
/// </summary>
public interface IApplicationQueueReader
{
    Task<IReadOnlyList<ApplicationQueueSummary>> GetQueueAsync(string? bearerToken = null, CancellationToken cancellationToken = default);

    Task<ApplicationQueueSummary?> GetApplicationAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default);

    Task<int> GetApplicationDocumentCountAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default);
}
