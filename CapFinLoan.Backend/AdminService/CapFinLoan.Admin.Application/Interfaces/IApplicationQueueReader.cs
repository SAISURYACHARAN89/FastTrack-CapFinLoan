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
/// Interface to communicate with ApplicationService and DocumentService via HTTP.
/// </summary>
public interface IApplicationQueueReader
{
    // ── Read operations ──────────────────────────────────────────────────────
    Task<IReadOnlyList<ApplicationQueueSummary>> GetQueueAsync(string? bearerToken = null, CancellationToken cancellationToken = default);

    Task<ApplicationQueueSummary?> GetApplicationAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default);

    Task<int> GetApplicationDocumentCountAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default);

    /// <summary>Gets the current status string of an application from ApplicationService.</summary>
    Task<string?> GetApplicationStatusAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default);

    // ── Write operations ─────────────────────────────────────────────────────
    /// <summary>
    /// Calls ApplicationService POST /applications/{id}/status to sync the admin decision.
    /// Returns false if the call fails (non-fatal; decision is already persisted locally).
    /// </summary>
    Task<bool> UpdateApplicationStatusAsync(int applicationId, string status, string? reason, string? bearerToken = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calls DocumentService PUT /documents/{id}/verify-status to update document verification state.
    /// </summary>
    Task<bool> UpdateDocumentStatusAsync(int documentId, string status, string? bearerToken = null, CancellationToken cancellationToken = default);
}
