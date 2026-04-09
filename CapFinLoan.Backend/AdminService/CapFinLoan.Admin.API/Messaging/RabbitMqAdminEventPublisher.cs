using System.Text;
using System.Text.Json;
using CapFinLoan.Admin.Application.Events;
using CapFinLoan.Admin.Application.Interfaces;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace CapFinLoan.Admin.API.Messaging;

public sealed class RabbitMqAdminEventPublisher : IAdminEventPublisher
{
    private readonly RabbitMqOptions _options;

    public RabbitMqAdminEventPublisher(IOptions<RabbitMqOptions> options)
    {
        _options = options.Value;
    }

    public Task PublishDecisionMadeAsync(AdminDecisionMadeEvent decisionEvent, CancellationToken cancellationToken = default)
    {
        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost
        };

        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        channel.ExchangeDeclare(
            exchange: _options.ExchangeName,
            type: ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            arguments: null);

        var payload = JsonSerializer.Serialize(decisionEvent);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: _options.AdminDecisionMadeRoutingKey,
            basicProperties: properties,
            body: body);

        return Task.CompletedTask;
    }
}
