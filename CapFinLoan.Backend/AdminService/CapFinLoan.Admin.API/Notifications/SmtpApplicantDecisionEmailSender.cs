using System.Net;
using System.Net.Mail;
using CapFinLoan.Admin.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace CapFinLoan.Admin.API.Notifications;

public sealed class SmtpApplicantDecisionEmailSender : IApplicantDecisionEmailSender
{
    private readonly SmtpOptions _smtp;
    private readonly DecisionEmailOptions _decisionEmail;
    private readonly ILogger<SmtpApplicantDecisionEmailSender> _logger;

    public SmtpApplicantDecisionEmailSender(
        IOptions<SmtpOptions> smtp,
        IOptions<DecisionEmailOptions> decisionEmail,
        ILogger<SmtpApplicantDecisionEmailSender> logger)
    {
        _smtp = smtp.Value;
        _decisionEmail = decisionEmail.Value;
        _logger = logger;
    }

    public async Task SendDecisionEmailAsync(
        string toEmail,
        string applicantName,
        int applicationId,
        string decision,
        string? remarks,
        CancellationToken cancellationToken = default)
    {
        var smtpUser = (_smtp.UserName ?? string.Empty).Trim();
        var smtpPassword = (_smtp.Password ?? string.Empty).Replace(" ", string.Empty, StringComparison.Ordinal);

        if (string.IsNullOrWhiteSpace(_smtp.Host)
            || string.IsNullOrWhiteSpace(_smtp.FromEmail)
            || string.IsNullOrWhiteSpace(smtpUser)
            || string.IsNullOrWhiteSpace(smtpPassword))
        {
            _logger.LogWarning("SMTP settings are incomplete; skipping decision email for application {ApplicationId}.", applicationId);
            return;
        }

        var subject = _decisionEmail.SubjectTemplate
            .Replace("{ApplicationId}", applicationId.ToString(), StringComparison.Ordinal)
            .Replace("{Decision}", decision, StringComparison.OrdinalIgnoreCase);

        var body = BuildHtmlBody(applicantName, applicationId, decision, remarks);

        using var message = new MailMessage
        {
            From = new MailAddress(_smtp.FromEmail, _smtp.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };

        message.To.Add(new MailAddress(toEmail));

        using var client = new SmtpClient(_smtp.Host, _smtp.Port)
        {
            EnableSsl = _smtp.EnableSsl,
            Credentials = new NetworkCredential(smtpUser, smtpPassword)
        };

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message);
    }

    private string BuildHtmlBody(
        string applicantName,
        int applicationId,
        string decision,
        string? remarks)
    {
        var safeName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(applicantName) ? "Applicant" : applicantName);
        var safeDecision = WebUtility.HtmlEncode(decision);
        var safeRemarks = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(remarks) ? "No additional remarks provided." : remarks);
        var safeSupport = WebUtility.HtmlEncode(_decisionEmail.SupportEmail);

        return $"""
               <html>
                 <body style=\"font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5\">
                   <h2 style=\"margin-bottom:12px;\">Loan Application Decision</h2>
                   <p>Hello {safeName},</p>
                   <p>Your loan application <strong>#{applicationId}</strong> has been reviewed.</p>
                   <p><strong>Decision:</strong> {safeDecision}</p>
                   <p><strong>Remarks:</strong> {safeRemarks}</p>
                   <p>If you have any questions, contact us at {safeSupport}.</p>
                   <p>Regards,<br/>CapFinLoan Team</p>
                 </body>
               </html>
               """;
    }
}
