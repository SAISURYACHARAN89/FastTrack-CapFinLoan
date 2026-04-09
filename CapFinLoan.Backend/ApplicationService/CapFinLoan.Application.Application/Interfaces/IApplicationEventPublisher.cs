using CapFinLoan.Application.Application.Events;

namespace CapFinLoan.Application.Application.Interfaces;

public interface IApplicationEventPublisher
{
    Task PublishSubmittedAsync(ApplicationSubmittedEvent applicationEvent, CancellationToken cancellationToken = default);
}
