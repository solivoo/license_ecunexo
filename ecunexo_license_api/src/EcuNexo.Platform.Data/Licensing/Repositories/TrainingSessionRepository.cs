using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Training;
using EcuNexo.Platform.Core.Training;
using EcuNexo.Platform.Data.Licensing;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Data.Licensing.Repositories;

public sealed class TrainingSessionRepository : ITrainingSessionRepository
{
    private readonly LicensingDbContext _db;

    public TrainingSessionRepository(LicensingDbContext db)
    {
        _db = db;
    }

    public async Task<TrainingSession?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.TrainingSessions.FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    public async Task<IReadOnlyList<TrainingSession>> ListByCustomerAsync(string customerId, CancellationToken ct)
    {
        return await _db.TrainingSessions
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.ScheduledAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TrainingSession>> ListByLicenseGrantAsync(Guid licenseGrantId, CancellationToken ct)
    {
        return await _db.TrainingSessions
            .Where(t => t.LicenseGrantId == licenseGrantId)
            .OrderByDescending(t => t.ScheduledAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TrainingSession>> ListAllAsync(CancellationToken ct)
    {
        return await _db.TrainingSessions
            .OrderByDescending(t => t.ScheduledAt)
            .ToListAsync(ct);
    }

    public void Add(TrainingSession session)
    {
        _db.TrainingSessions.Add(session);
    }
}
