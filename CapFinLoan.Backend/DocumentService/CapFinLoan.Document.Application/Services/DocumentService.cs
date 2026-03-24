using CapFinLoan.Document.Application.DTOs;
using CapFinLoan.Document.Application.Interfaces;
using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;

namespace CapFinLoan.Document.Application.Services;

public sealed class DocumentService
{
    public const long MaxFileSizeBytes = 5L * 1024L * 1024L;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/png"
    };

    private readonly IDocumentRepository _documents;
    private readonly IDocumentFileStorage _storage;

    public DocumentService(IDocumentRepository documents, IDocumentFileStorage storage)
    {
        _documents = documents;
        _storage = storage;
    }

    public async Task<DocumentDto> UploadAsync(
        int userId,
        int applicationId,
        string fileName,
        string contentType,
        long fileSize,
        Stream fileStream,
        CancellationToken cancellationToken = default)
    {
        if (fileSize <= 0)
            throw new InvalidOperationException("File is empty.");

        if (fileSize > MaxFileSizeBytes)
            throw new InvalidOperationException("File is too large. Max allowed size is 5MB.");

        if (!AllowedContentTypes.Contains(contentType))
            throw new InvalidOperationException("Unsupported file type. Allowed: pdf, jpg, png.");

        var storedFileName = await _storage.SaveAsync(fileStream, fileName, contentType, cancellationToken);

        var doc = new DocumentEntity
        {
            ApplicationId = applicationId,
            UserId = userId,
            FileName = fileName,
            StoredFileName = storedFileName,
            ContentType = contentType,
            FileSize = fileSize,
            Status = "PENDING",
            UploadedAt = DateTime.UtcNow
        };

        await _documents.AddAsync(doc, cancellationToken);
        await _documents.SaveChangesAsync(cancellationToken);

        return Map(doc);
    }

    public async Task<IReadOnlyList<DocumentDto>> GetByApplicationAsync(int userId, int applicationId, CancellationToken cancellationToken = default)
    {
        var docs = await _documents.GetByApplicationIdForUserAsync(applicationId, userId, cancellationToken);
        return docs.Select(Map).ToArray();
    }

    public async Task<bool> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var doc = await _documents.GetByIdForUserForUpdateAsync(id, userId, cancellationToken);
        if (doc == null)
            return false;

        await _documents.DeleteAsync(doc, cancellationToken);
        await _documents.SaveChangesAsync(cancellationToken);

        await _storage.DeleteAsync(doc.StoredFileName, cancellationToken);
        return true;
    }

    private static DocumentDto Map(DocumentEntity d) => new()
    {
        Id = d.Id,
        ApplicationId = d.ApplicationId,
        FileName = d.FileName,
        Status = d.Status,
        UploadedAt = d.UploadedAt
    };
}
