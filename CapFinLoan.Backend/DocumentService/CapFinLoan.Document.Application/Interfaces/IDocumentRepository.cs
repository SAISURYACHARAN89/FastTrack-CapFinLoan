using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;

namespace CapFinLoan.Document.Application.Interfaces;

public interface IDocumentRepository
{
    Task AddAsync(DocumentEntity document, CancellationToken cancellationToken = default);
    Task<DocumentEntity?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DocumentEntity>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default);
    Task DeleteAsync(DocumentEntity document, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    // Owner-scoped helpers (required for secure access)
    Task<DocumentEntity?> GetByIdForUserForUpdateAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DocumentEntity>> GetByApplicationIdForUserAsync(int applicationId, int userId, CancellationToken cancellationToken = default);
}
