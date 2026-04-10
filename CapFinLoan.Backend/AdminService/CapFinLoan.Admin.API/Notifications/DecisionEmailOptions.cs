namespace CapFinLoan.Admin.API.Notifications;

public sealed class DecisionEmailOptions
{
    public string SubjectTemplate { get; set; } = "CapFinLoan Application #{ApplicationId} - {Decision}";
    public string SupportEmail { get; set; } = "support@capfinloan.local";
}
