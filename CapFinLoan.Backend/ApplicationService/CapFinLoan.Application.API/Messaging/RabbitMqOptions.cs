namespace CapFinLoan.Application.API.Messaging;

public sealed class RabbitMqOptions
{
    public string HostName { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string UserName { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";
    public string ExchangeName { get; set; } = "capfinloan.events";
    public string ApplicationSubmittedRoutingKey { get; set; } = "application.submitted";
    public string AdminDecisionMadeRoutingKey { get; set; } = "admin.decision.made";
    public string AdminDecisionQueue { get; set; } = "application.admin.decision.queue";
}
