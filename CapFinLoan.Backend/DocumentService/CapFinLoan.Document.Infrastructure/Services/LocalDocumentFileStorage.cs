using CapFinLoan.Document.Application.Interfaces;
using CapFinLoan.Document.Infrastructure.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CapFinLoan.Document.Infrastructure.Services;

public sealed class LocalDocumentFileStorage : IDocumentFileStorage
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    };

    private readonly IWebHostEnvironment _env;
    private readonly UploadOptions _options;
    private readonly ILogger<LocalDocumentFileStorage> _logger;

    public LocalDocumentFileStorage(
        IWebHostEnvironment env,
        IOptions<UploadOptions> options,
        ILogger<LocalDocumentFileStorage> logger)
    {
        _env = env;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> SaveAsync(Stream fileStream, string originalFileName, string contentType, CancellationToken cancellationToken = default)
    {
        var ext = GetSafeExtension(originalFileName, contentType);
        var storedFileName = $"{Guid.NewGuid():N}{ext}";

        var uploadsRoot = GetUploadsRoot();
        Directory.CreateDirectory(uploadsRoot);

        var fullPath = Path.Combine(uploadsRoot, storedFileName);

        await using var outStream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await fileStream.CopyToAsync(outStream, cancellationToken);

        return storedFileName;
    }

    public Task DeleteAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
            return Task.CompletedTask;

        try
        {
            var uploadsRoot = GetUploadsRoot();
            var fullPath = Path.Combine(uploadsRoot, storedFileName);

            if (File.Exists(fullPath))
                File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete stored file {StoredFileName}", storedFileName);
        }

        return Task.CompletedTask;
    }

    public Task<(Stream FileStream, string ContentType)?> GetAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
            return Task.FromResult<(Stream, string)?>(null);

        var uploadsRoot = GetUploadsRoot();
        var fullPath = Path.Combine(uploadsRoot, storedFileName);

        if (!File.Exists(fullPath))
            return Task.FromResult<(Stream, string)?>(null);

        var ext = Path.GetExtension(storedFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf"  => "application/pdf",
            ".jpg"  => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".png"  => "image/png",
            _       => "application/octet-stream"
        };

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult<(Stream, string)?>((stream, contentType));
    }

    private string GetUploadsRoot()
    {
        var relative = (_options.RelativePath ?? "uploads").Trim();
        if (string.IsNullOrWhiteSpace(relative))
            relative = "uploads";

        if (Path.IsPathRooted(relative) || relative.Contains(".."))
            relative = "uploads";

        return Path.Combine(_env.ContentRootPath, relative);
    }

    private static string GetSafeExtension(string originalFileName, string contentType)
    {
        // Prefer extension derived from content type to prevent spoofing.
        var extFromType = contentType?.ToLowerInvariant() switch
        {
            "application/pdf" => ".pdf",
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            _ => string.Empty
        };

        if (!string.IsNullOrWhiteSpace(extFromType))
            return extFromType;

        var ext = Path.GetExtension(originalFileName ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(ext) && AllowedExtensions.Contains(ext))
            return ext.ToLowerInvariant();

        return ".bin";
    }
}
