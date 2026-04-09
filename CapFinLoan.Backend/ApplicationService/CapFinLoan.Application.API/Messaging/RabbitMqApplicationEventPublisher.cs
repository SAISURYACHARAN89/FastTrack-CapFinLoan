using System.Text;
using System.Text.Json;
using CapFinLoan.Application.Application.Events;
using CapFinLoan.Application.Application.Interfaces;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace CapFinLoan.Application.API.Messaging;

public sealed class RabbitMqApplicationEventPublisher : IApplicationEventPublisher
{
    private readonly RabbitMqOptions _options;

    public RabbitMqApplicationEventPublisher(IOptions<RabbitMqOptions> options)
    {
        _options = options.Value;
    }

    public Task PublishSubmittedAsync(ApplicationSubmittedEvent applicationEvent, CancellationToken cancellationToken = default)
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

        var payload = JsonSerializer.Serialize(applicationEvent);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: _options.ApplicationSubmittedRoutingKey,
            basicProperties: properties,
            body: body);

        return Task.CompletedTask;
    }
}
