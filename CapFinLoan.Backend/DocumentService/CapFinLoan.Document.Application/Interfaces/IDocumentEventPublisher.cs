using CapFinLoan.Document.Application.Events;

namespace CapFinLoan.Document.Application.Interfaces;

public interface IDocumentEventPublisher
{
    Task PublishUploadedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default);
    Task PublishReplacedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default);
    Task PublishStatusChangedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default);
    Task PublishDeletedAsync(DocumentEvent documentEvent, CancellationToken cancellationToken = default);
}
