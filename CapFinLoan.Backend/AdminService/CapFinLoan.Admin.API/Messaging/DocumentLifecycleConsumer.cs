using System.Text;
using System.Text.Json;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CapFinLoan.Admin.API.Messaging;

public sealed class DocumentLifecycleConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DocumentLifecycleConsumer> _logger;
    private readonly RabbitMqOptions _options;
    private IConnection? _connection;
    private IModel? _channel;

    public DocumentLifecycleConsumer(
        IServiceScopeFactory scopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<DocumentLifecycleConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                StartConsumer();
                _logger.LogInformation("Document lifecycle consumers started for queues: {Queues}",
                    string.Join(", ",
                        _options.DocumentUploadedQueue,
                        _options.DocumentReplacedQueue,
                        _options.DocumentStatusChangedQueue,
                        _options.DocumentDeletedQueue));
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Document lifecycle consumer unavailable. Retrying in 10 seconds.");
                Cleanup();
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
    }

    private void StartConsumer()
    {
        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost,
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.ExchangeDeclare(
            exchange: _options.ExchangeName,
            type: ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            arguments: null);

        DeclareAndBind(_options.DocumentUploadedQueue, _options.DocumentUploadedRoutingKey);
        DeclareAndBind(_options.DocumentReplacedQueue, _options.DocumentReplacedRoutingKey);
        DeclareAndBind(_options.DocumentStatusChangedQueue, _options.DocumentStatusChangedRoutingKey);
        DeclareAndBind(_options.DocumentDeletedQueue, _options.DocumentDeletedRoutingKey);

        _channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);

        RegisterConsumer(_options.DocumentUploadedQueue);
        RegisterConsumer(_options.DocumentReplacedQueue);
        RegisterConsumer(_options.DocumentStatusChangedQueue);
        RegisterConsumer(_options.DocumentDeletedQueue);
    }

    private void DeclareAndBind(string queue, string routingKey)
    {
        if (_channel == null)
            return;

        _channel.QueueDeclare(
            queue: queue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        _channel.QueueBind(
            queue: queue,
            exchange: _options.ExchangeName,
            routingKey: routingKey);
    }

    private void RegisterConsumer(string queue)
    {
        if (_channel == null)
            return;

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += OnMessageReceivedAsync;

        _channel.BasicConsume(
            queue: queue,
            autoAck: false,
            consumer: consumer);
    }

    private async Task OnMessageReceivedAsync(object sender, BasicDeliverEventArgs eventArgs)
    {
        if (_channel == null)
            return;

        try
        {
            var payload = Encoding.UTF8.GetString(eventArgs.Body.ToArray());
            var documentEvent = JsonSerializer.Deserialize<DocumentEvent>(payload);

            if (documentEvent == null || documentEvent.ApplicationId <= 0)
            {
                _channel.BasicAck(eventArgs.DeliveryTag, false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var historyRepo = scope.ServiceProvider.GetRequiredService<IAdminHistoryRepository>();

            var oldStatus = string.IsNullOrWhiteSpace(documentEvent.PreviousStatus)
                ? "DOCUMENT_EVENT"
                : $"DOC_{documentEvent.PreviousStatus!.Trim().ToUpperInvariant()}";

            var newStatus = !string.IsNullOrWhiteSpace(documentEvent.CurrentStatus)
                ? $"DOC_{documentEvent.CurrentStatus!.Trim().ToUpperInvariant()}"
                : (documentEvent.EventType ?? eventArgs.RoutingKey).Trim().ToUpperInvariant();

            var entry = new ApplicationStatusHistory
            {
                ApplicationId = documentEvent.ApplicationId,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Remarks = $"RabbitMQ {eventArgs.RoutingKey}: {documentEvent.DocumentType ?? "DOCUMENT"} ({documentEvent.FileName ?? "N/A"})",
                ChangedBy = 0,
                ChangedAtUtc = documentEvent.OccurredAtUtc == default ? DateTime.UtcNow : documentEvent.OccurredAtUtc
            };

            await historyRepo.AddAsync(entry);
            await historyRepo.SaveChangesAsync();

            _channel.BasicAck(eventArgs.DeliveryTag, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document lifecycle event for routing key {RoutingKey}.", eventArgs.RoutingKey);
            _channel.BasicNack(eventArgs.DeliveryTag, false, false);
        }
    }

    private void Cleanup()
    {
        try { _channel?.Close(); } catch { }
        try { _connection?.Close(); } catch { }
        _channel?.Dispose();
        _connection?.Dispose();
        _channel = null;
        _connection = null;
    }

    public override void Dispose()
    {
        Cleanup();
        base.Dispose();
    }
}
