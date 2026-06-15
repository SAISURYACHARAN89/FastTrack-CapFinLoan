using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace CapFinLoan.Application.Application.Services;

public sealed class ChatService
{
    private readonly IApplicationRepository _applications;
    private readonly HttpClient _httpClient;
    private readonly string _ollamaBaseUrl;
    private readonly string _ollamaModel;
    private readonly string _authServiceUrl;
    private readonly string _documentServiceUrl;
    private readonly ILogger<ChatService> _logger;

    private const string SystemKnowledge = """
        You are the CapFinLoan AI Assistant, a highly accurate and professional fintech expert. 
        Your goal is to provide consistent, reliable information based ONLY on the provided user context and platform rules.

        CORE PERSONALITY:
        - Professional, helpful, and concise.
        - Never speculate. If information is missing from the context, state that you don't have that specific detail.
        - Always double-check the application IDs and statuses before responding.

        PLATFORM OVERVIEW:
        CapFinLoan is a loan management platform. Users go through:
        1. KYC Profile Completion.
        2. Loan Application Creation.
        3. Document Upload (PAN, Bank Statements, etc.).
        4. Admin Review (5-7 days).
        5. Decision (APPROVED/REJECTED).

        APPLICATION STATUSES:
        - PENDING: Draft state, editable.
        - SUBMITTED: Waiting for review.
        - UNDER_REVIEW: Admin is checking it.
        - APPROVED: Funds ready.
        - REJECTED: Failed review (check Note for reason).

        DOCUMENT RULES:
        - Required: PAN Card, Bank Statements (6 months), ITR (2-3 years), Address Proof.
        - Statuses: PENDING (not yet verified), VERIFIED, REJECTED.

        NAVIGATION LINKS (Markdown format):
        - Dashboard: [/dashboard]
        - My Applications: [/applications]
        - Profile: [/profile]
        - New Application: [/new-application]
        - Specific Application: [/applications/{id}]

        RESPONSE GUIDELINES:
        - Use "I" and "You". E.g., "I see you have an active application..."
        - When mentioning an application, always link it: [Application #{id}](/applications/{id}).
        - If a user asks about documents, list what they have uploaded and what might be missing based on the "Document Rules".
        - Limit responses to 3-4 sentences.
        """;

    public ChatService(
        IApplicationRepository applications,
        HttpClient httpClient,
        string ollamaBaseUrl,
        string ollamaModel,
        string authServiceUrl,
        string documentServiceUrl,
        ILogger<ChatService> logger)
    {
        _applications = applications;
        _httpClient = httpClient;
        _ollamaBaseUrl = ollamaBaseUrl;
        _ollamaModel = ollamaModel;
        _authServiceUrl = authServiceUrl;
        _documentServiceUrl = documentServiceUrl;
        _logger = logger;
    }

    public async Task<ChatResponseDto> ChatAsync(
        int userId, 
        string userMessage, 
        string authHeader,
        CancellationToken cancellationToken = default)
    {
        // 1. Fetch Context in Parallel
        var profileTask = GetUserProfileAsync(authHeader, cancellationToken);
        var appsTask = _applications.GetByUserIdAsync(userId, cancellationToken);

        await Task.WhenAll(profileTask, appsTask);

        var profile = profileTask.Result;
        var apps = appsTask.Result.OrderByDescending(a => a.CreatedAt).ToList();

        // 2. Fetch Documents for the most relevant applications (latest 3)
        var docsContext = new List<string>();
        foreach (var app in apps.Take(3))
        {
            var docs = await GetApplicationDocumentsAsync(app.Id, authHeader, cancellationToken);
            if (docs.Any())
            {
                var docList = string.Join(", ", docs.Select(d => $"{d.DocumentType} ({d.Status})"));
                docsContext.Add($"Application #{app.Id} Documents: {docList}");
            }
            else
            {
                docsContext.Add($"Application #{app.Id} Documents: None uploaded yet.");
            }
        }

        // 3. Construct Context Strings
        var profileStr = profile == null 
            ? "USER_PROFILE: Anonymous/Unknown" 
            : $"""
               USER_PROFILE:
               - Name: {profile.Name}
               - KYC Status: {(profile.IsProfileComplete ? "Complete" : "Incomplete")}
               - Email: {profile.Email}
               """;

        var appsStr = !apps.Any()
            ? "APPLICATIONS: User has no loan applications."
            : "APPLICATIONS:\n" + string.Join("\n", apps.Select(a => 
                $"- ID #{a.Id}: Status={a.Status}, Amount=₹{a.Amount:N0}, Created={a.CreatedAt:dd MMM yyyy}{(a.DecisionReason != null ? $", DecisionNote=\"{a.DecisionReason}\"" : "")}"));

        var docsStr = "DOCUMENTATION_STATUS:\n" + (docsContext.Any() ? string.Join("\n", docsContext) : "No document records found.");

        // 4. Build Final Prompt
        var fullPrompt = $"""
            {SystemKnowledge}

            --- USER CONTEXT ---
            {profileStr}

            {appsStr}

            {docsStr}
            -------------------

            STRICT RULE: Only use the data above. If the user asks about an application ID not listed, say you don't see it. 
            If they ask about their "status", refer to the latest application ID #{apps.FirstOrDefault()?.Id}.

            User Message: {userMessage}

            Assistant:
            """;

        // 5. Call Ollama
        var requestBody = new
        {
            model = _ollamaModel,
            prompt = fullPrompt,
            stream = false,
            options = new { 
                temperature = 0.1, 
                num_predict = 300,
                top_p = 0.9
            }
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(
                $"{_ollamaBaseUrl}/api/generate",
                requestBody,
                cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<OllamaResponse>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            var reply = result?.Response?.Trim() ?? "I'm sorry, I'm having trouble processing that right now.";
            return new ChatResponseDto { Reply = reply };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat AI failure for user {UserId}", userId);
            return new ChatResponseDto { Reply = "I'm temporarily unavailable. Please try again in a moment." };
        }
    }

    private async Task<ExternalUserDto?> GetUserProfileAsync(string authHeader, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authHeader)) return null;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_authServiceUrl}/auth/me");
            if (AuthenticationHeaderValue.TryParse(authHeader, out var header))
            {
                request.Headers.Authorization = header;
                var resp = await _httpClient.SendAsync(request, ct);
                if (resp.IsSuccessStatusCode)
                    return await resp.Content.ReadFromJsonAsync<ExternalUserDto>(cancellationToken: ct);
            }
        }
        catch { /* ignored */ }
        return null;
    }

    private async Task<List<ExternalDocumentDto>> GetApplicationDocumentsAsync(int appId, string authHeader, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authHeader)) return new();
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_documentServiceUrl}/documents/application/{appId}");
            if (AuthenticationHeaderValue.TryParse(authHeader, out var header))
            {
                request.Headers.Authorization = header;
                var resp = await _httpClient.SendAsync(request, ct);
                if (resp.IsSuccessStatusCode)
                    return await resp.Content.ReadFromJsonAsync<List<ExternalDocumentDto>>(cancellationToken: ct) ?? new();
            }
        }
        catch { /* ignored */ }
        return new();
    }

    private sealed class OllamaResponse { public string? Response { get; set; } }

    private sealed class ExternalUserDto
    {
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public bool IsProfileComplete { get; set; }
    }

    private sealed class ExternalDocumentDto
    {
        public string DocumentType { get; set; } = "";
        public string Status { get; set; } = "";
    }
}
