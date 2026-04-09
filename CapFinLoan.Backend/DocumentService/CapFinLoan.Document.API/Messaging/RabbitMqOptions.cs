namespace CapFinLoan.Document.API.Messaging;

public sealed class RabbitMqOptions
{
    public string HostName { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string UserName { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";
    public string ExchangeName { get; set; } = "capfinloan.events";
    public string DocumentUploadedRoutingKey { get; set; } = "document.uploaded";
    public string DocumentReplacedRoutingKey { get; set; } = "document.replaced";
    public string DocumentStatusChangedRoutingKey { get; set; } = "document.status.changed";
    public string DocumentDeletedRoutingKey { get; set; } = "document.deleted";
}
