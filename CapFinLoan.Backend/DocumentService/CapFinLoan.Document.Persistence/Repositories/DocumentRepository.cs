using CapFinLoan.Document.Application.Interfaces;
using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Document.Persistence.Repositories;

public sealed class DocumentRepository : IDocumentRepository
{
    private readonly DocumentDbContext _db;

    public DocumentRepository(DocumentDbContext db)
    {
        _db = db;
    }

    public Task AddAsync(DocumentEntity document, CancellationToken cancellationToken = default)
    {
        return _db.Documents.AddAsync(document, cancellationToken).AsTask();
    }

    public Task<DocumentEntity?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _db.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<DocumentEntity>> GetByApplicationIdAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        return await _db.Documents
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(cancellationToken);
    }

    public Task DeleteAsync(DocumentEntity document, CancellationToken cancellationToken = default)
    {
        _db.Documents.Remove(document);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }

    public Task<DocumentEntity?> GetByIdForUserForUpdateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        return _db.Documents.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<DocumentEntity>> GetByApplicationIdForUserAsync(int applicationId, int userId, CancellationToken cancellationToken = default)
    {
        return await _db.Documents
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId && x.UserId == userId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(cancellationToken);
    }
}
