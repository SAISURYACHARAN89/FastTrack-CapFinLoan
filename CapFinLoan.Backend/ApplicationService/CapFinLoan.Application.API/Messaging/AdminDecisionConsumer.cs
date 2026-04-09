using System.Text;
using System.Text.Json;
using CapFinLoan.Application.Application.Services;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CapFinLoan.Application.API.Messaging;

public sealed class AdminDecisionConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AdminDecisionConsumer> _logger;
    private readonly RabbitMqOptions _options;
    private IConnection? _connection;
    private IModel? _channel;

    public AdminDecisionConsumer(
        IServiceScopeFactory scopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<AdminDecisionConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                StartConsumer();
                _logger.LogInformation("RabbitMQ consumer started for queue {Queue}", _options.AdminDecisionQueue);
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RabbitMQ admin decision consumer unavailable. Retrying in 10 seconds.");
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
            queue: _options.AdminDecisionQueue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        _channel.QueueBind(
            queue: _options.AdminDecisionQueue,
            exchange: _options.ExchangeName,
            routingKey: _options.AdminDecisionMadeRoutingKey);

        _channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += OnMessageReceivedAsync;

        _channel.BasicConsume(
            queue: _options.AdminDecisionQueue,
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
            var decisionEvent = JsonSerializer.Deserialize<AdminDecisionMadeEvent>(payload);

            if (decisionEvent == null || string.IsNullOrWhiteSpace(decisionEvent.Decision))
            {
                _channel.BasicAck(eventArgs.DeliveryTag, false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var applicationService = scope.ServiceProvider.GetRequiredService<ApplicationService>();
            var existing = await applicationService.GetByIdAsAdminAsync(decisionEvent.ApplicationId);

            if (existing == null)
            {
                _channel.BasicAck(eventArgs.DeliveryTag, false);
                return;
            }

            if (string.Equals(existing.Status, decisionEvent.Decision, StringComparison.OrdinalIgnoreCase))
            {
                _channel.BasicAck(eventArgs.DeliveryTag, false);
                return;
            }

            await applicationService.SetStatusAsAdminAsync(
                decisionEvent.ApplicationId,
                decisionEvent.Decision,
                decisionEvent.Remarks);

            _channel.BasicAck(eventArgs.DeliveryTag, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed processing admin decision RabbitMQ event.");
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
