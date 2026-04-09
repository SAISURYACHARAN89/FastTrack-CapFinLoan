using System.Text;
using System.Text.Json;
using CapFinLoan.Document.Application.Events;
using CapFinLoan.Document.Application.Interfaces;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace CapFinLoan.Document.API.Messaging;

public sealed class RabbitMqDocumentEventPublisher : IDocumentEventPublisher
{
    private readonly RabbitMqOptions _options;

    public RabbitMqDocumentEventPublisher(IOptions<RabbitMqOptions> options)
    {
        _options = options.Value;
    }

    public Task PublishUploadedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default)
        => PublishAsync(_options.DocumentUploadedRoutingKey, documentEvent);

    public Task PublishReplacedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default)
        => PublishAsync(_options.DocumentReplacedRoutingKey, documentEvent);

    public Task PublishStatusChangedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default)
        => PublishAsync(_options.DocumentStatusChangedRoutingKey, documentEvent);

    public Task PublishDeletedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default)
        => PublishAsync(_options.DocumentDeletedRoutingKey, documentEvent);

    private Task PublishAsync(string routingKey, DocumentEvent documentEvent)
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

        var payload = JsonSerializer.Serialize(documentEvent);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: routingKey,
            basicProperties: properties,
            body: body);

        return Task.CompletedTask;
    }
}
