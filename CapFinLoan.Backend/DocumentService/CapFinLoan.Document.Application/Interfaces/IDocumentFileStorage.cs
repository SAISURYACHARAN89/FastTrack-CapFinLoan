namespace CapFinLoan.Document.Application.Interfaces;

public interface IDocumentFileStorage
{
    Task<string> SaveAsync(Stream fileStream, string originalFileName, string contentType, CancellationToken cancellationToken = default);
    Task DeleteAsync(string storedFileName, CancellationToken cancellationToken = default);
}
