using CapFinLoan.Admin.Application.DTOs;
using CapFinLoan.Admin.Application.Exceptions;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Application.Services;
using CapFinLoan.Admin.Domain.Entities;
using CapFinLoan.Admin.Application.Events;
using Microsoft.Extensions.Logging;
using Moq;

namespace CapFinLoan.Admin.Application.Tests;

public class AdminServiceTests
{
    private readonly Mock<IAdminDecisionRepository> _mockDecisionsRepo;
    private readonly Mock<IAdminHistoryRepository> _mockHistoryRepo;
    private readonly Mock<IApplicationQueueReader> _mockQueueReader;
    private readonly Mock<IAdminEventPublisher> _mockEventPublisher;
    private readonly Mock<IApplicantDecisionEmailSender> _mockEmailSender;
    private readonly Mock<ILogger<AdminService>> _mockLogger;
    private readonly AdminService _adminService;

    public AdminServiceTests()
    {
        _mockDecisionsRepo = new Mock<IAdminDecisionRepository>();
        _mockHistoryRepo = new Mock<IAdminHistoryRepository>();
        _mockQueueReader = new Mock<IApplicationQueueReader>();
        _mockEventPublisher = new Mock<IAdminEventPublisher>();
        _mockEmailSender = new Mock<IApplicantDecisionEmailSender>();
        _mockLogger = new Mock<ILogger<AdminService>>();

        _adminService = new AdminService(
            _mockDecisionsRepo.Object,
            _mockHistoryRepo.Object,
            _mockQueueReader.Object,
            _mockEventPublisher.Object,
            _mockEmailSender.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task MakeDecisionAsync_WithValidDecision_AddsDecisionToRepository()
    {
        // Arrange
        var applicationId = 1;
        var adminUserId = 123;
        var request = new MakeDecisionRequestDto
        {
            Decision = "APPROVED",
            Remarks = "Looks good",
            ApprovedAmount = 50000,
            TenureMonths = 24,
            InterestRate = 5.5m
        };
        var bearerToken = "test_token";

        _mockQueueReader
            .Setup(x => x.GetApplicationStatusAsync(applicationId, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync("SUBMITTED");

        _mockQueueReader
            .Setup(x => x.GetApplicationAsync(applicationId, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationQueueSummary { Id = applicationId, UserId = 7 });

        _mockQueueReader
            .Setup(x => x.GetApplicantContactAsync(7, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicantContactSummary
            {
                UserId = 7,
                Name = "Applicant",
                Email = "applicant@example.com"
            });

        // Act
        await _adminService.MakeDecisionAsync(applicationId, adminUserId, request, bearerToken);

        // Assert
        _mockDecisionsRepo.Verify(
            repo => repo.AddAsync(It.Is<AdminDecision>(d =>
                d.ApplicationId == applicationId &&
                d.Decision == "APPROVED" &&
                d.Remarks == "Looks good" &&
                d.ApprovedAmount == 50000 &&
                d.TenureMonths == 24 &&
                d.InterestRate == 5.5m &&
                d.CreatedBy == adminUserId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("INVALID_DECISION")]
    [InlineData("  ")]
    public async Task MakeDecisionAsync_WithInvalidDecision_ThrowsInvalidOperationException(string invalidDecision)
    {
        // Arrange
        var request = new MakeDecisionRequestDto { Decision = invalidDecision };

        // Act & Assert
        await Assert.ThrowsAsync<AdminValidationException>(() =>
            _adminService.MakeDecisionAsync(1, 1, request));
    }

    [Fact]
    public async Task MakeDecisionAsync_WithNullDecision_ThrowsInvalidOperationException()
    {
        // Arrange
        var request = new MakeDecisionRequestDto { Decision = null };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<AdminValidationException>(() =>
            _adminService.MakeDecisionAsync(1, 1, request));

        Assert.Equal("Decision is required.", exception.Message);
    }

    [Fact]
    public async Task MakeDecisionAsync_WithFinalDecision_PublishesEventAndAddsHistory()
    {
        // Arrange
        var applicationId = 1;
        var adminUserId = 123;
        var request = new MakeDecisionRequestDto { Decision = "APPROVED" };
        var bearerToken = "test_token";

        _mockQueueReader
            .Setup(x => x.GetApplicationStatusAsync(applicationId, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync("SUBMITTED");

        _mockQueueReader
            .Setup(x => x.GetApplicationAsync(applicationId, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationQueueSummary { Id = applicationId, UserId = 7 });

        _mockQueueReader
            .Setup(x => x.GetApplicantContactAsync(7, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicantContactSummary
            {
                UserId = 7,
                Name = "Applicant",
                Email = "applicant@example.com"
            });

        // Act
        await _adminService.MakeDecisionAsync(applicationId, adminUserId, request, bearerToken);

        // Assert
        _mockEventPublisher.Verify(
            p => p.PublishDecisionMadeAsync(It.IsAny<AdminDecisionMadeEvent>(), It.IsAny<CancellationToken>()),
            Times.Once);

        _mockEmailSender.Verify(
            e => e.SendDecisionEmailAsync(
                "applicant@example.com",
                "Applicant",
                applicationId,
                "APPROVED",
                request.Remarks,
                It.IsAny<CancellationToken>()),
            Times.Once);

        _mockHistoryRepo.Verify(
            h => h.AddAsync(It.Is<ApplicationStatusHistory>(hist =>
                hist.ApplicationId == applicationId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task MakeDecisionAsync_WithUnderReviewDecision_DoesNotPublishEventButAddsHistory()
    {
        // Arrange
        var applicationId = 1;
        var adminUserId = 123;
        var request = new MakeDecisionRequestDto { Decision = "UNDER_REVIEW" };
        var bearerToken = "test_token";

        _mockQueueReader
            .Setup(x => x.GetApplicationStatusAsync(applicationId, bearerToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync("SUBMITTED");

        // Act
        await _adminService.MakeDecisionAsync(applicationId, adminUserId, request, bearerToken);

        // Assert
        _mockEventPublisher.Verify(
            p => p.PublishDecisionMadeAsync(It.IsAny<AdminDecisionMadeEvent>(), It.IsAny<CancellationToken>()),
            Times.Never);

        _mockEmailSender.Verify(
            e => e.SendDecisionEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);

        _mockHistoryRepo.Verify(
            h => h.AddAsync(It.Is<ApplicationStatusHistory>(hist =>
                hist.ApplicationId == applicationId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
