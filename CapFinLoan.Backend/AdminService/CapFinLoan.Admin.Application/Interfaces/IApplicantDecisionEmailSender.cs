namespace CapFinLoan.Admin.Application.Interfaces;

public interface IApplicantDecisionEmailSender
{
    Task SendDecisionEmailAsync(
        string toEmail,
        string applicantName,
        int applicationId,
        string decision,
        string? remarks,
        CancellationToken cancellationToken = default);
}
