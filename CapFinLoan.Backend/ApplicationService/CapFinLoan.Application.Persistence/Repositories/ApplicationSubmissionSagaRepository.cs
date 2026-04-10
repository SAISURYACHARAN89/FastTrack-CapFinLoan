using CapFinLoan.Application.Application.Interfaces;
using CapFinLoan.Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Application.Persistence.Repositories;

public sealed class ApplicationSubmissionSagaRepository : IApplicationSubmissionSagaRepository
{
    private readonly ApplicationDbContext _db;

    public ApplicationSubmissionSagaRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<ApplicationSubmissionSaga?> GetByApplicationIdForUpdateAsync(int applicationId, CancellationToken cancellationToken = default)
    {
        return _db.ApplicationSubmissionSagas
            .FirstOrDefaultAsync(x => x.ApplicationId == applicationId, cancellationToken);
    }

    public Task AddAsync(ApplicationSubmissionSaga saga, CancellationToken cancellationToken = default)
    {
        return _db.ApplicationSubmissionSagas.AddAsync(saga, cancellationToken).AsTask();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
