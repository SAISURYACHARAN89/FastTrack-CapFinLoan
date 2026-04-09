using CapFinLoan.Document.Application.DTOs;
using CapFinLoan.Document.Application.Events;
using CapFinLoan.Document.Application.Interfaces;
using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;
using Microsoft.Extensions.Logging;

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
    private readonly IDocumentEventPublisher _eventPublisher;
    private readonly ILogger<DocumentService> _logger;

    public DocumentService(
        IDocumentRepository documents,
        IDocumentFileStorage storage,
        IDocumentEventPublisher eventPublisher,
        ILogger<DocumentService> logger)
    {
        _documents = documents;
        _storage = storage;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    public async Task<DocumentDto> UploadAsync(
        int userId,
        int applicationId,
        string fileName,
        string contentType,
        long fileSize,
        string documentType,
        Stream fileStream,
        CancellationToken cancellationToken = default)
    {
        if (fileSize <= 0)
            throw new InvalidOperationException("File is empty.");

        if (fileSize > MaxFileSizeBytes)
            throw new InvalidOperationException("File is too large. Max allowed size is 5MB.");

        if (!AllowedContentTypes.Contains(contentType))
            throw new InvalidOperationException("Unsupported file type. Allowed: pdf, jpg, png.");

        if (string.IsNullOrWhiteSpace(documentType))
            throw new InvalidOperationException("DocumentType is required (e.g., 'PAN', 'ITR').");

        var storedFileName = await _storage.SaveAsync(fileStream, fileName, contentType, cancellationToken);

        var doc = new DocumentEntity
        {
            ApplicationId = applicationId,
            UserId = userId,
            FileName = fileName,
            StoredFileName = storedFileName,
            ContentType = contentType,
            FileSize = fileSize,
            DocumentType = documentType,
            Status = "PENDING",
            UploadedAt = DateTime.UtcNow
        };

        await _documents.AddAsync(doc, cancellationToken);
        await _documents.SaveChangesAsync(cancellationToken);

        try
        {
            await _eventPublisher.PublishUploadedAsync(new DocumentEvent
            {
                EventType = "DOCUMENT_UPLOADED",
                DocumentId = doc.Id,
                ApplicationId = doc.ApplicationId,
                UserId = doc.UserId,
                DocumentType = doc.DocumentType,
                FileName = doc.FileName,
                CurrentStatus = doc.Status,
                OccurredAtUtc = DateTime.UtcNow
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ publish failed for document upload. DocumentId: {DocumentId}", doc.Id);
        }

        return Map(doc);
    }

    public async Task<DocumentDto?> ReplaceAsync(
        int userId,
        int id,
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

        var doc = await _documents.GetByIdForUserForUpdateAsync(id, userId, cancellationToken);
        if (doc == null)
            return null;

        var oldStoredFileName = doc.StoredFileName;
        var storedFileName = await _storage.SaveAsync(fileStream, fileName, contentType, cancellationToken);

        doc.FileName = fileName;
        doc.StoredFileName = storedFileName;
        doc.ContentType = contentType;
        doc.FileSize = fileSize;
        doc.Status = "PENDING";
        doc.UploadedAt = DateTime.UtcNow;

        await _documents.SaveChangesAsync(cancellationToken);

        try
        {
            await _eventPublisher.PublishReplacedAsync(new DocumentEvent
            {
                EventType = "DOCUMENT_REPLACED",
                DocumentId = doc.Id,
                ApplicationId = doc.ApplicationId,
                UserId = doc.UserId,
                DocumentType = doc.DocumentType,
                FileName = doc.FileName,
                CurrentStatus = doc.Status,
                OccurredAtUtc = DateTime.UtcNow
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ publish failed for document replace. DocumentId: {DocumentId}", doc.Id);
        }

        await _storage.DeleteAsync(oldStoredFileName, cancellationToken);
        return Map(doc);
    }

    public async Task<IReadOnlyList<DocumentDto>> GetByApplicationAsync(int userId, int applicationId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<CapFinLoan.Document.Domain.Entities.Document> docs;
        if (isAdmin)
        {
            docs = await _documents.GetByApplicationIdAsync(applicationId, cancellationToken);
        }
        else
        {
            docs = await _documents.GetByApplicationIdForUserAsync(applicationId, userId, cancellationToken);
        }
        return docs.Select(Map).ToArray();
    }

    public async Task<bool> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var doc = await _documents.GetByIdForUserForUpdateAsync(id, userId, cancellationToken);
        if (doc == null)
            return false;

        await _documents.DeleteAsync(doc, cancellationToken);
        await _documents.SaveChangesAsync(cancellationToken);

        try
        {
            await _eventPublisher.PublishDeletedAsync(new DocumentEvent
            {
                EventType = "DOCUMENT_DELETED",
                DocumentId = doc.Id,
                ApplicationId = doc.ApplicationId,
                UserId = doc.UserId,
                DocumentType = doc.DocumentType,
                FileName = doc.FileName,
                CurrentStatus = doc.Status,
                OccurredAtUtc = DateTime.UtcNow
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ publish failed for document delete. DocumentId: {DocumentId}", doc.Id);
        }

        await _storage.DeleteAsync(doc.StoredFileName, cancellationToken);
        return true;
    }

    private static readonly HashSet<string> ValidVerifyStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "VERIFIED",
        "REJECTED"
    };

    public async Task<bool> UpdateStatusAsync(
        int documentId,
        string status,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = (status ?? string.Empty).Trim().ToUpperInvariant();
        if (!ValidVerifyStatuses.Contains(normalizedStatus))
            throw new InvalidOperationException("Status must be VERIFIED or REJECTED.");

        var doc = await _documents.GetByIdForUpdateAsync(documentId, cancellationToken);
        if (doc == null)
            return false;

        var previousStatus = doc.Status;
        doc.Status = normalizedStatus;
        await _documents.SaveChangesAsync(cancellationToken);

        try
        {
            await _eventPublisher.PublishStatusChangedAsync(new DocumentEvent
            {
                EventType = "DOCUMENT_STATUS_CHANGED",
                DocumentId = doc.Id,
                ApplicationId = doc.ApplicationId,
                UserId = doc.UserId,
                DocumentType = doc.DocumentType,
                FileName = doc.FileName,
                PreviousStatus = previousStatus,
                CurrentStatus = doc.Status,
                OccurredAtUtc = DateTime.UtcNow
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ publish failed for document status change. DocumentId: {DocumentId}", doc.Id);
        }

        return true;
    }

    private static DocumentDto Map(DocumentEntity d) => new()
    {
        Id = d.Id,
        ApplicationId = d.ApplicationId,
        FileName = d.FileName,
        Status = d.Status,
        UploadedAt = d.UploadedAt,
        DocumentType = d.DocumentType
    };

    /// <summary>
    /// Returns (stream, contentType, originalFileName) for the given document.
    /// Admins can download any document; regular users only their own.
    /// </summary>
    public async Task<(Stream FileStream, string ContentType, string FileName)?> DownloadAsync(
        int userId,
        int documentId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        DocumentEntity? doc = isAdmin
            ? await _documents.GetByIdAsync(documentId, cancellationToken)
            : await _documents.GetByIdForUserForUpdateAsync(documentId, userId, cancellationToken);

        if (doc == null)
            return null;

        var result = await _storage.GetAsync(doc.StoredFileName, cancellationToken);
        if (result == null)
            return null;

        return (result.Value.FileStream, result.Value.ContentType, doc.FileName);
    }
}
