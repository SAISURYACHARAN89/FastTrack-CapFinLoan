using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Exceptions;
using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Application.Services;
using CapFinLoan.Application.Domain.Entities;
using Microsoft.Extensions.Logging;
using Moq;

namespace CapFinLoan.Application.Application.Tests;

public class ApplicationServiceTests
{
    private readonly Mock<IApplicationRepository> _mockAppRepo;
    private readonly Mock<IApplicationStatusHistoryRepository> _mockHistoryRepo;
    private readonly Mock<IApplicationEventPublisher> _mockEventPublisher;
    private readonly Mock<IApplicationSubmissionSagaCoordinator> _mockSagaCoordinator;
    private readonly Mock<ILogger<ApplicationService>> _mockLogger;
    private readonly ApplicationService _applicationService;

    public ApplicationServiceTests()
    {
        _mockAppRepo = new Mock<IApplicationRepository>();
        _mockHistoryRepo = new Mock<IApplicationStatusHistoryRepository>();
        _mockEventPublisher = new Mock<IApplicationEventPublisher>();
        _mockSagaCoordinator = new Mock<IApplicationSubmissionSagaCoordinator>();

        _mockLogger = new Mock<ILogger<ApplicationService>>();

        _applicationService = new ApplicationService(
            _mockAppRepo.Object,
            _mockHistoryRepo.Object,
            _mockEventPublisher.Object,
            _mockSagaCoordinator.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task SubmitAsync_WithPendingApplication_StartsSaga()
    {
        // Arrange
        var userId = 1;
        var applicationId = 1;
        var application = new LoanApplication { Id = applicationId, UserId = userId, Status = "PENDING" };

        _mockAppRepo
            .Setup(x => x.GetByIdForUserForUpdateAsync(applicationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(application);

        // Act
        await _applicationService.SubmitAsync(userId, applicationId);

        // Assert
        _mockSagaCoordinator.Verify(
            saga => saga.StartSubmissionSagaAsync(applicationId, userId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("SUBMITTED")]
    [InlineData("APPROVED")]
    [InlineData("UNDER_REVIEW")]
    public async Task SubmitAsync_WithNonSubmittableStatus_ThrowsInvalidOperationException(string status)
    {
        // Arrange
        var userId = 1;
        var applicationId = 1;
        var application = new LoanApplication { Id = applicationId, UserId = userId, Status = status };

        _mockAppRepo
            .Setup(x => x.GetByIdForUserForUpdateAsync(applicationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(application);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ApplicationValidationException>(() =>
            _applicationService.SubmitAsync(userId, applicationId));

        Assert.Equal("Only PENDING or REJECTED applications can be submitted.", exception.Message);
    }

    [Fact]
    public async Task SubmitAsync_WhenApplicationNotFound_ReturnsNull()
    {
        // Arrange
        var userId = 1;
        var applicationId = 1;

        _mockAppRepo
            .Setup(x => x.GetByIdForUserForUpdateAsync(applicationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((LoanApplication)null);

        // Act
        var result = await _applicationService.SubmitAsync(userId, applicationId);

        // Assert
        Assert.Null(result);
        _mockSagaCoordinator.Verify(
            saga => saga.StartSubmissionSagaAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SubmitAsync_WhenEventPublishFails_CompensatesSaga()
    {
        // Arrange
        var userId = 1;
        var applicationId = 1;
        var application = new LoanApplication { Id = applicationId, UserId = userId, Status = "PENDING" };

        _mockAppRepo
            .Setup(x => x.GetByIdForUserForUpdateAsync(applicationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(application);

        _mockEventPublisher
            .Setup(p => p.PublishSubmittedAsync(It.IsAny<Events.ApplicationSubmittedEvent>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("RabbitMQ is down"));

        // Act
        await _applicationService.SubmitAsync(userId, applicationId);

        // Assert
        _mockSagaCoordinator.Verify(
            saga => saga.StartSubmissionSagaAsync(applicationId, userId, It.IsAny<CancellationToken>()),
            Times.Once);

        _mockSagaCoordinator.Verify(
            saga => saga.CompensateSubmissionFailureAsync(applicationId, "PENDING", It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
