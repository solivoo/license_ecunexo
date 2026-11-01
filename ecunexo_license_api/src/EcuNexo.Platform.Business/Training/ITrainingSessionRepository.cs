using EcuNexo.Core.Common;
using EcuNexo.Platform.Core.Training;

namespace EcuNexo.Platform.Business.Training;

public interface ITrainingSessionRepository
{
    Task<TrainingSession?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<TrainingSession>> ListByCustomerAsync(string customerId, CancellationToken ct);
    Task<IReadOnlyList<TrainingSession>> ListByLicenseGrantAsync(Guid licenseGrantId, CancellationToken ct);
    Task<IReadOnlyList<TrainingSession>> ListAllAsync(CancellationToken ct);
    void Add(TrainingSession session);
}
