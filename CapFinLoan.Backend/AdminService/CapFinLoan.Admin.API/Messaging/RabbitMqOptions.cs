namespace CapFinLoan.Admin.API.Messaging;

public sealed class RabbitMqOptions
{
    public string HostName { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string UserName { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";
    public string ExchangeName { get; set; } = "capfinloan.events";
    public string ApplicationSubmittedRoutingKey { get; set; } = "application.submitted";
    public string ApplicationSubmittedQueue { get; set; } = "admin.application.submitted.queue";
    public string AdminDecisionMadeRoutingKey { get; set; } = "admin.decision.made";
    public string DocumentUploadedRoutingKey { get; set; } = "document.uploaded";
    public string DocumentReplacedRoutingKey { get; set; } = "document.replaced";
    public string DocumentStatusChangedRoutingKey { get; set; } = "document.status.changed";
    public string DocumentDeletedRoutingKey { get; set; } = "document.deleted";
    public string DocumentUploadedQueue { get; set; } = "admin.document.uploaded.queue";
    public string DocumentReplacedQueue { get; set; } = "admin.document.replaced.queue";
    public string DocumentStatusChangedQueue { get; set; } = "admin.document.status.changed.queue";
    public string DocumentDeletedQueue { get; set; } = "admin.document.deleted.queue";
}
