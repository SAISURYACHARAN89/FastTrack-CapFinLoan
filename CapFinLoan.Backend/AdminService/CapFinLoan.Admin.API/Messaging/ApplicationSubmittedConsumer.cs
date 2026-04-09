using System.Text;
using System.Text.Json;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Domain.Entities;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CapFinLoan.Admin.API.Messaging;

public sealed class ApplicationSubmittedConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ApplicationSubmittedConsumer> _logger;
    private readonly RabbitMqOptions _options;
    private IConnection? _connection;
    private IModel? _channel;

    public ApplicationSubmittedConsumer(
        IServiceScopeFactory scopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<ApplicationSubmittedConsumer> logger)
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
                _logger.LogInformation("RabbitMQ consumer started for queue {Queue}", _options.ApplicationSubmittedQueue);
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RabbitMQ consumer is unavailable. Retrying in 10 seconds.");
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

        _channel.QueueDeclare(
            queue: _options.ApplicationSubmittedQueue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        _channel.QueueBind(
            queue: _options.ApplicationSubmittedQueue,
            exchange: _options.ExchangeName,
            routingKey: _options.ApplicationSubmittedRoutingKey);

        _channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += OnMessageReceivedAsync;

        _channel.BasicConsume(
            queue: _options.ApplicationSubmittedQueue,
            autoAck: false,
            consumer: consumer);
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

    private async Task OnMessageReceivedAsync(object sender, BasicDeliverEventArgs eventArgs)
    {
        if (_channel == null)
            return;

        try
        {
            var payload = Encoding.UTF8.GetString(eventArgs.Body.ToArray());
            var applicationEvent = JsonSerializer.Deserialize<ApplicationSubmittedEvent>(payload);

            if (applicationEvent == null)
            {
                _channel.BasicAck(eventArgs.DeliveryTag, false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var historyRepo = scope.ServiceProvider.GetRequiredService<IAdminHistoryRepository>();

            var entry = new ApplicationStatusHistory
            {
                ApplicationId = applicationEvent.ApplicationId,
                OldStatus = string.IsNullOrWhiteSpace(applicationEvent.PreviousStatus) ? "UNKNOWN" : applicationEvent.PreviousStatus,
                NewStatus = string.IsNullOrWhiteSpace(applicationEvent.NewStatus) ? "SUBMITTED" : applicationEvent.NewStatus,
                Remarks = $"RabbitMQ event {applicationEvent.EventId}",
                ChangedBy = 0,
                ChangedAtUtc = applicationEvent.OccurredAtUtc == default ? DateTime.UtcNow : applicationEvent.OccurredAtUtc
            };

            await historyRepo.AddAsync(entry);
            await historyRepo.SaveChangesAsync();

            _channel.BasicAck(eventArgs.DeliveryTag, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process application submitted event from RabbitMQ.");
            _channel.BasicNack(eventArgs.DeliveryTag, false, false);
        }
    }

    public override void Dispose()
    {
        Cleanup();
        base.Dispose();
    }
}
