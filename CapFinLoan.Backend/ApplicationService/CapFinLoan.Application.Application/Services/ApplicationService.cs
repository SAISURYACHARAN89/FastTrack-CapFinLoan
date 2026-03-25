using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Services;

public sealed class ApplicationService
{
    private readonly IApplicationRepository _applications;
    private readonly IApplicationStatusHistoryRepository _history;

    public ApplicationService(IApplicationRepository applications, IApplicationStatusHistoryRepository history)
    {
        _applications = applications;
        _history = history;
    }

    public async Task<ApplicationDto> CreateAsync(int userId, CreateApplicationDto dto, CancellationToken cancellationToken = default)
    {
        var application = new LoanApplication
        {
            UserId = userId,
            Amount = dto.Amount,
            TenureMonths = dto.TenureMonths,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };

        await _applications.AddAsync(application, cancellationToken);
        await _applications.SaveChangesAsync(cancellationToken);

        await _history.AddAsync(new ApplicationStatusHistory
        {
            ApplicationId = application.Id,
            UserId = userId,
            Status = "PENDING",
            ChangedAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _history.SaveChangesAsync(cancellationToken);

        return Map(application);
    }

    public async Task<ApplicationDto?> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var entity = await _applications.GetByIdForUserAsync(id, userId, cancellationToken);
        return entity == null ? null : Map(entity);
    }

    public async Task<ApplicationDto?> UpdateAsync(int userId, int id, CreateApplicationDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _applications.GetByIdForUserForUpdateAsync(id, userId, cancellationToken);
        if (entity == null)
            return null;

        if (!string.Equals(entity.Status, "PENDING", StringComparison.Ordinal))
            throw new InvalidOperationException("Only PENDING applications can be updated.");

        entity.Amount = dto.Amount;
        entity.TenureMonths = dto.TenureMonths;

        await _applications.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<ApplicationDto?> SubmitAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var entity = await _applications.GetByIdForUserForUpdateAsync(id, userId, cancellationToken);
        if (entity == null)
            return null;

        if (!string.Equals(entity.Status, "PENDING", StringComparison.Ordinal))
            throw new InvalidOperationException("Only PENDING applications can be submitted.");

        entity.Status = "SUBMITTED";

        await _history.AddAsync(new ApplicationStatusHistory
        {
            ApplicationId = entity.Id,
            UserId = userId,
            Status = "SUBMITTED",
            ChangedAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _applications.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<IReadOnlyList<ApplicationStatusHistoryDto>?> GetTimelineAsync(int userId, int applicationId, CancellationToken cancellationToken = default)
    {
        var app = await _applications.GetByIdForUserAsync(applicationId, userId, cancellationToken);
        if (app == null)
            return null;

        var entries = await _history.GetByApplicationIdForUserAsync(applicationId, userId, cancellationToken);
        return entries.Select(x => new ApplicationStatusHistoryDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            Status = x.Status,
            ChangedAtUtc = x.ChangedAtUtc,
            Note = x.Note
        }).ToArray();
    }

    public async Task<ApplicationDto?> SetStatusAsAdminAsync(int applicationId, string status, string? reason, CancellationToken cancellationToken = default)
    {
        var entity = await _applications.GetByIdForUpdateAsync(applicationId, cancellationToken);
        if (entity == null)
            return null;

        var normalizedStatus = (status ?? string.Empty).Trim().ToUpperInvariant();
        if (normalizedStatus is not ("UNDER_REVIEW" or "APPROVED" or "REJECTED"))
            throw new InvalidOperationException("Unsupported status. Allowed: UNDER_REVIEW, APPROVED, REJECTED.");

        entity.Status = normalizedStatus;

        if (normalizedStatus is "APPROVED" or "REJECTED")
        {
            entity.DecisionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
            entity.DecidedAtUtc = DateTime.UtcNow;
        }
        else
        {
            entity.DecisionReason = null;
            entity.DecidedAtUtc = null;
        }

        await _history.AddAsync(new ApplicationStatusHistory
        {
            ApplicationId = entity.Id,
            UserId = entity.UserId,
            Status = normalizedStatus,
            ChangedAtUtc = DateTime.UtcNow,
            Note = entity.DecisionReason
        }, cancellationToken);

        await _applications.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<IReadOnlyList<ApplicationDto>> GetMyApplicationsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var entities = await _applications.GetByUserIdAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<ApplicationDto>> GetAllApplicationsAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _applications.GetAllAsync(cancellationToken);
        return entities.Select(Map).ToList();
    }

    private static ApplicationDto Map(LoanApplication entity)
    {
        return new ApplicationDto
        {
            Id = entity.Id,
            UserId = entity.UserId,
            Amount = entity.Amount,
            TenureMonths = entity.TenureMonths,
            Status = entity.Status,
            DecisionReason = entity.DecisionReason,
            DecidedAtUtc = entity.DecidedAtUtc,
            CreatedAt = entity.CreatedAt
        };
    }
}
