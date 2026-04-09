using CapFinLoan.Admin.Application.Events;

namespace CapFinLoan.Admin.Application.Interfaces;

public interface IAdminEventPublisher
{
    Task PublishDecisionMadeAsync(AdminDecisionMadeEvent decisionEvent, CancellationToken cancellationToken = default);
}
