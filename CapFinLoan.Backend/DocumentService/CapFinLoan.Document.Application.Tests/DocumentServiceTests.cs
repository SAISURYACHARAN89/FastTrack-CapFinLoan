using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CapFinLoan.Document.Application.DTOs;
using CapFinLoan.Document.Application.Exceptions;
using CapFinLoan.Document.Application.Interfaces;
using CapFinLoan.Document.Application.Services;
using CapFinLoan.Document.Application.Events;
using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace CapFinLoan.Document.Application.Tests
{
    public class DocumentServiceTests
    {
        private readonly Mock<IDocumentRepository> _mockDocumentRepo;
        private readonly Mock<IDocumentFileStorage> _mockFileStorage;
        private readonly Mock<IDocumentEventPublisher> _mockEventPublisher;
        private readonly Mock<ILogger<DocumentService>> _mockLogger;
        private readonly DocumentService _documentService;

        public DocumentServiceTests()
        {
            _mockDocumentRepo = new Mock<IDocumentRepository>();
            _mockFileStorage = new Mock<IDocumentFileStorage>();
            _mockEventPublisher = new Mock<IDocumentEventPublisher>();
            _mockLogger = new Mock<ILogger<DocumentService>>();

            _documentService = new DocumentService(
                _mockDocumentRepo.Object,
                _mockFileStorage.Object,
                _mockEventPublisher.Object,
                _mockLogger.Object);
        }

        [Fact]
        public async Task UploadAsync_WithValidFile_UploadsAndCreatesDocument()
        {
            // Arrange
            var userId = 1;
            var applicationId = 1;
            var fileName = "test.pdf";
            var contentType = "application/pdf";
            var fileSize = 1024;
            var documentType = "PAN";
            var fileStream = new MemoryStream();
            var storedFileName = "generated-file-name.pdf";

            _mockFileStorage
                .Setup(s => s.SaveAsync(fileStream, fileName, contentType, It.IsAny<CancellationToken>()))
                .ReturnsAsync(storedFileName);

            // Act
            var result = await _documentService.UploadAsync(userId, applicationId, fileName, contentType, fileSize, documentType, fileStream);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(fileName, result.FileName);
            Assert.Equal(documentType, result.DocumentType);

            _mockDocumentRepo.Verify(
                r => r.AddAsync(It.Is<DocumentEntity>(d =>
                    d.UserId == userId &&
                    d.ApplicationId == applicationId &&
                    d.FileName == fileName &&
                    d.StoredFileName == storedFileName &&
                    d.DocumentType == documentType &&
                    d.Status == "PENDING"),
                It.IsAny<CancellationToken>()),
                Times.Once);

            _mockDocumentRepo.Verify(
                r => r.SaveChangesAsync(It.IsAny<CancellationToken>()),
                Times.Once);

            _mockEventPublisher.Verify(
                p => p.PublishUploadedAsync(It.IsAny<DocumentEvent>(), It.IsAny<CancellationToken>()),
                Times.Once);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-100)]
        public async Task UploadAsync_WithInvalidFileSize_ThrowsInvalidOperationException(long fileSize)
        {
            // Act & Assert
            var exception = await Assert.ThrowsAsync<DocumentValidationException>(() =>
                _documentService.UploadAsync(1, 1, "file.pdf", "application/pdf", fileSize, "PAN", new MemoryStream()));

            Assert.Equal("File is empty.", exception.Message);
        }

        [Fact]
        public async Task UploadAsync_WithFileSizeTooLarge_ThrowsInvalidOperationException()
        {
            // Arrange
            var fileSize = DocumentService.MaxFileSizeBytes + 1;

            // Act & Assert
            var exception = await Assert.ThrowsAsync<DocumentValidationException>(() =>
                _documentService.UploadAsync(1, 1, "file.pdf", "application/pdf", fileSize, "PAN", new MemoryStream()));

            Assert.Equal("File is too large. Max allowed size is 5MB.", exception.Message);
        }

        [Fact]
        public async Task UploadAsync_WithUnsupportedContentType_ThrowsInvalidOperationException()
        {
            // Act & Assert
            var exception = await Assert.ThrowsAsync<DocumentValidationException>(() =>
                _documentService.UploadAsync(1, 1, "file.txt", "text/plain", 1024, "PAN", new MemoryStream()));

            Assert.Equal("Unsupported file type. Allowed: pdf, jpg, png.", exception.Message);
        }

        [Fact]
        public async Task UploadAsync_WithMissingDocumentType_ThrowsInvalidOperationException()
        {
            // Act & Assert
            var exception = await Assert.ThrowsAsync<DocumentValidationException>(() =>
                _documentService.UploadAsync(1, 1, "file.pdf", "application/pdf", 1024, " ", new MemoryStream()));

            Assert.Equal("DocumentType is required (e.g., 'PAN', 'ITR').", exception.Message);
        }
    }
}
