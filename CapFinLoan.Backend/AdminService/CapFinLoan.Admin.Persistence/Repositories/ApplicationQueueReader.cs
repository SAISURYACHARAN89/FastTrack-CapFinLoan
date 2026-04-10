using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CapFinLoan.Admin.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CapFinLoan.Admin.Persistence.Repositories;

/// <summary>
/// HTTP client adapter that communicates with ApplicationService and DocumentService.
/// Uses IHttpClientFactory to avoid socket exhaustion (fixes C1).
/// </summary>
public sealed class ApplicationQueueReader : IApplicationQueueReader
{
    private readonly IHttpClientFactory _httpClientFactory;

    public ApplicationQueueReader(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HttpClient CreateApplicationClient(string? bearerToken)
    {
        var client = _httpClientFactory.CreateClient("application");
        ApplyBearer(client, bearerToken);
        return client;
    }

    private HttpClient CreateDocumentClient(string? bearerToken)
    {
        var client = _httpClientFactory.CreateClient("document");
        ApplyBearer(client, bearerToken);
        return client;
    }

    private HttpClient CreateAuthClient(string? bearerToken)
    {
        var client = _httpClientFactory.CreateClient("auth");
        ApplyBearer(client, bearerToken);
        return client;
    }

    private static void ApplyBearer(HttpClient client, string? bearerToken)
    {
        if (string.IsNullOrWhiteSpace(bearerToken))
            return;

        if (AuthenticationHeaderValue.TryParse(bearerToken, out var header))
            client.DefaultRequestHeaders.Authorization = header;
    }

    // ── Read operations ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ApplicationQueueSummary>> GetQueueAsync(
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateApplicationClient(bearerToken);

        var response = await client.GetAsync("applications/queue", cancellationToken);
        response.EnsureSuccessStatusCode();

        var apps = await response.Content
            .ReadFromJsonAsync<List<ApplicationServiceDto>>(cancellationToken: cancellationToken)
            ?? new List<ApplicationServiceDto>();

        var result = new List<ApplicationQueueSummary>(apps.Count);
        foreach (var app in apps)
        {
            var documentCount = await GetApplicationDocumentCountAsync(app.Id, bearerToken, cancellationToken);
            result.Add(MapSummary(app, documentCount));
        }

        return result;
    }

    public async Task<ApplicationQueueSummary?> GetApplicationAsync(
        int applicationId,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateApplicationClient(bearerToken);

        var response = await client.GetAsync($"applications/{applicationId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var app = await response.Content
            .ReadFromJsonAsync<ApplicationServiceDto>(cancellationToken: cancellationToken);
        if (app == null)
            return null;

        var documentCount = await GetApplicationDocumentCountAsync(app.Id, bearerToken, cancellationToken);
        return MapSummary(app, documentCount);
    }

    public async Task<string?> GetApplicationStatusAsync(
        int applicationId,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateApplicationClient(bearerToken);

        var response = await client.GetAsync($"applications/{applicationId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var app = await response.Content
            .ReadFromJsonAsync<ApplicationServiceDto>(cancellationToken: cancellationToken);

        return app?.Status;
    }

    public async Task<int> GetApplicationDocumentCountAsync(
        int applicationId,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateDocumentClient(bearerToken);

        var response = await client.GetAsync($"documents/application/{applicationId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return 0;

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        return doc.RootElement.ValueKind == JsonValueKind.Array
            ? doc.RootElement.GetArrayLength()
            : 0;
    }

    public async Task<ApplicantContactSummary?> GetApplicantContactAsync(
        int userId,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateAuthClient(bearerToken);
        var response = await client.GetAsync($"auth/users/identifiers?ids={userId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var users = await response.Content
            .ReadFromJsonAsync<List<AuthUserIdentifierDto>>(cancellationToken: cancellationToken)
            ?? new List<AuthUserIdentifierDto>();

        var match = users.FirstOrDefault(x => x.UserId == userId);
        if (match == null)
            return null;

        return new ApplicantContactSummary
        {
            UserId = match.UserId,
            Name = match.Name,
            Email = match.Email
        };
    }

    // ── Write operations ──────────────────────────────────────────────────────

    /// <summary>
    /// Syncs the admin decision back to ApplicationService so LoanApplication.Status stays consistent (fixes C2).
    /// Non-fatal: if the call fails, the admin decision is already saved locally.
    /// </summary>
    public async Task<bool> UpdateApplicationStatusAsync(
        int applicationId,
        string status,
        string? reason,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateApplicationClient(bearerToken);

        var payload = new { Status = status, Reason = reason };
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        var response = await client.PostAsync(
            $"applications/{applicationId}/status",
            content,
            cancellationToken);

        return response.IsSuccessStatusCode;
    }

    /// <summary>
    /// Calls DocumentService to update document verification status (fixes stub I2).
    /// </summary>
    public async Task<bool> UpdateDocumentStatusAsync(
        int documentId,
        string status,
        string? bearerToken = null,
        CancellationToken cancellationToken = default)
    {
        var client = CreateDocumentClient(bearerToken);

        var payload = new { Status = status };
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        var response = await client.PutAsync(
            $"documents/{documentId}/verify-status",
            content,
            cancellationToken);

        return response.IsSuccessStatusCode;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static ApplicationQueueSummary MapSummary(ApplicationServiceDto app, int documentCount) => new()
    {
        Id = app.Id,
        UserId = app.UserId,
        Amount = app.Amount,
        TenureMonths = app.TenureMonths,
        Status = app.Status,
        CreatedAtUtc = app.CreatedAt,
        DocumentCount = documentCount
    };
}

internal sealed class ApplicationServiceDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public int TenureMonths { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

internal sealed class AuthUserIdentifierDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
