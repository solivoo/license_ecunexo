using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Training;

namespace EcuNexo.Platform.Business.Training.Queries.ListTrainingSessions;

public sealed record ListTrainingSessionsQuery(
    string? CustomerId = null,
    Guid? LicenseGrantId = null) : IQuery<IReadOnlyList<TrainingSessionItem>>;

public sealed record TrainingSessionItem(
    Guid Id,
    string CustomerId,
    Guid LicenseGrantId,
    string Topic,
    string Kind,
    string Modality,
    int DurationHours,
    string Status,
    DateTimeOffset ScheduledAt,
    DateTimeOffset? CompletedAt,
    string? Notes,
    IReadOnlyList<string> AttendeeEmails,
    string CreatedByOperatorId,
    DateTimeOffset CreatedAt);

public sealed class ListTrainingSessionsHandler : IQueryHandler<ListTrainingSessionsQuery, IReadOnlyList<TrainingSessionItem>>
{
    private readonly ITrainingSessionRepository _sessions;

    public ListTrainingSessionsHandler(ITrainingSessionRepository sessions)
    {
        _sessions = sessions;
    }

    public async Task<Result<IReadOnlyList<TrainingSessionItem>>> Handle(ListTrainingSessionsQuery query, CancellationToken ct)
    {
        IReadOnlyList<TrainingSession> sessions;

        if (query.CustomerId is not null)
            sessions = await _sessions.ListByCustomerAsync(query.CustomerId, ct).ConfigureAwait(false);
        else if (query.LicenseGrantId.HasValue)
            sessions = await _sessions.ListByLicenseGrantAsync(query.LicenseGrantId.Value, ct).ConfigureAwait(false);
        else
            sessions = await _sessions.ListAllAsync(ct).ConfigureAwait(false);

        var items = sessions.Select(Map).ToList();
        return Result.Success<IReadOnlyList<TrainingSessionItem>>(items);
    }

    private static TrainingSessionItem Map(TrainingSession s) => new(
        s.Id,
        s.CustomerId,
        s.LicenseGrantId,
        s.Topic,
        s.Kind.ToString(),
        s.Modality.ToString(),
        s.DurationHours,
        s.Status.ToString(),
        s.ScheduledAt,
        s.CompletedAt,
        s.Notes,
        s.AttendeeEmails,
        s.CreatedByOperatorId,
        s.CreatedAt);
}
