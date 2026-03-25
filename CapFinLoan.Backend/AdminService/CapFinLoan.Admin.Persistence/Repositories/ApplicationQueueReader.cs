using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CapFinLoan.Admin.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CapFinLoan.Admin.Persistence.Repositories;

public sealed class ApplicationQueueReader : IApplicationQueueReader
{
    private readonly string _applicationServiceUrl;
    private readonly string _documentServiceUrl;

    public ApplicationQueueReader(IConfiguration configuration)
    {
        _applicationServiceUrl = configuration["ServiceUrls:ApplicationService"] ?? "http://localhost:5256";
        _documentServiceUrl = configuration["ServiceUrls:DocumentService"] ?? "http://localhost:5262";
    }

    private void ApplyBearerToClient(HttpClient client, string? bearerToken)
    {
        if (string.IsNullOrWhiteSpace(bearerToken))
            return;

        if (AuthenticationHeaderValue.TryParse(bearerToken, out var header))
        {
            client.DefaultRequestHeaders.Authorization = header;
        }
    }

    public async Task<IReadOnlyList<ApplicationQueueSummary>> GetQueueAsync(string? bearerToken = null, CancellationToken cancellationToken = default)
    {
        using var client = new HttpClient { BaseAddress = new Uri(_applicationServiceUrl) };
        ApplyBearerToClient(client, bearerToken);

        var response = await client.GetAsync("applications/queue", cancellationToken);
        response.EnsureSuccessStatusCode();

        var apps = await response.Content.ReadFromJsonAsync<List<ApplicationServiceDto>>(cancellationToken: cancellationToken)
                   ?? new List<ApplicationServiceDto>();

        var result = new List<ApplicationQueueSummary>(apps.Count);

        foreach (var app in apps)
        {
            var documentCount = await GetApplicationDocumentCountAsync(app.Id, bearerToken, cancellationToken);

            result.Add(new ApplicationQueueSummary
            {
                Id = app.Id,
                UserId = app.UserId,
                Amount = app.Amount,
                TenureMonths = app.TenureMonths,
                Status = app.Status,
                CreatedAtUtc = app.CreatedAt,
                DocumentCount = documentCount
            });
        }

        return result;
    }

    public async Task<ApplicationQueueSummary?> GetApplicationAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default)
    {
        using var client = new HttpClient { BaseAddress = new Uri(_applicationServiceUrl) };
        ApplyBearerToClient(client, bearerToken);

        var response = await client.GetAsync($"applications/{applicationId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var app = await response.Content.ReadFromJsonAsync<ApplicationServiceDto>(cancellationToken: cancellationToken);
        if (app == null)
            return null;

        var documentCount = await GetApplicationDocumentCountAsync(app.Id, bearerToken, cancellationToken);

        return new ApplicationQueueSummary
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

    public async Task<int> GetApplicationDocumentCountAsync(int applicationId, string? bearerToken = null, CancellationToken cancellationToken = default)
    {
        using var client = new HttpClient { BaseAddress = new Uri(_documentServiceUrl) };
        ApplyBearerToClient(client, bearerToken);

        var response = await client.GetAsync($"documents/application/{applicationId}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return 0;

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        return doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.GetArrayLength() : 0;
    }
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
