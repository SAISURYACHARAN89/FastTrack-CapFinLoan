using CapFinLoan.Application.Application.DTOs;
using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;

namespace CapFinLoan.Application.Application.Services;

public sealed class ApplicationService
{
    private readonly IApplicationRepository _applications;

    public ApplicationService(IApplicationRepository applications)
    {
        _applications = applications;
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
        await _applications.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<IReadOnlyList<ApplicationDto>> GetMyApplicationsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var entities = await _applications.GetByUserIdAsync(userId, cancellationToken);
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
            CreatedAt = entity.CreatedAt
        };
    }
}
