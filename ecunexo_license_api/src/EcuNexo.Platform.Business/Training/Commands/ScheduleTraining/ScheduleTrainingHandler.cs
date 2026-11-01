using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Core.Training;

namespace EcuNexo.Platform.Business.Training.Commands.ScheduleTraining;

public sealed record ScheduleTrainingCommand(
    string CustomerId,
    Guid LicenseGrantId,
    string Topic,
    TrainingSessionKind Kind,
    TrainingModality Modality,
    int DurationHours,
    DateTimeOffset ScheduledAt,
    string CreatedByOperatorId,
    IReadOnlyList<string>? AttendeeEmails = null,
    string? Notes = null) : ICommand<ScheduleTrainingResponse>;

public sealed record ScheduleTrainingResponse(
    Guid Id,
    string CustomerId,
    string Topic,
    string Status,
    DateTimeOffset ScheduledAt,
    IReadOnlyList<string> AttendeeEmails);

public sealed class ScheduleTrainingHandler : ICommandHandler<ScheduleTrainingCommand, ScheduleTrainingResponse>
{
    private readonly ITrainingSessionRepository _sessions;
    private readonly ILicenseGrantRepository _licenseGrants;
    private readonly ILicensingUnitOfWork _uow;
    private readonly IIdGenerator _idGenerator;

    public ScheduleTrainingHandler(
        ITrainingSessionRepository sessions,
        ILicenseGrantRepository licenseGrants,
        ILicensingUnitOfWork uow,
        IIdGenerator idGenerator)
    {
        _sessions = sessions;
        _licenseGrants = licenseGrants;
        _uow = uow;
        _idGenerator = idGenerator;
    }

    public async Task<Result<ScheduleTrainingResponse>> Handle(ScheduleTrainingCommand command, CancellationToken ct)
    {
        var license = await _licenseGrants.GetByIdAsync(command.LicenseGrantId, ct).ConfigureAwait(false);
        if (license is null)
            return Result.Failure<ScheduleTrainingResponse>(
                new Error("training.license.not_found", "La licencia asociada no existe.", ErrorType.NotFound));

        if (command.ScheduledAt < license.IssuedAtUtc)
            return Result.Failure<ScheduleTrainingResponse>(
                new Error(
                    "training.date.too_early",
                    $"La capacitación ({command.ScheduledAt:yyyy-MM-dd}) no puede ser anterior a la emisión de la licencia ({license.IssuedAtUtc:yyyy-MM-dd}).",
                    ErrorType.Validation));

        if (command.ScheduledAt >= license.ExpiresAtUtc)
            return Result.Failure<ScheduleTrainingResponse>(
                new Error(
                    "training.date.expired",
                    $"La capacitación ({command.ScheduledAt:yyyy-MM-dd}) debe programarse antes de que la licencia expire ({license.ExpiresAtUtc:yyyy-MM-dd}).",
                    ErrorType.Validation));

        var trainingFrom = license.EffectiveTrainingFrom();
        var trainingTo = license.EffectiveTrainingTo();
        if (command.ScheduledAt < trainingFrom)
            return Result.Failure<ScheduleTrainingResponse>(
                new Error(
                    "training.date.out_of_period",
                    $"La capacitación ({command.ScheduledAt:yyyy-MM-dd}) está fuera del período contratado de capacitación ({trainingFrom:yyyy-MM-dd} al {trainingTo:yyyy-MM-dd}).",
                    ErrorType.Validation));

        if (command.ScheduledAt >= trainingTo)
            return Result.Failure<ScheduleTrainingResponse>(
                new Error(
                    "training.date.out_of_period",
                    $"La capacitación ({command.ScheduledAt:yyyy-MM-dd}) está fuera del período contratado de capacitación ({trainingFrom:yyyy-MM-dd} al {trainingTo:yyyy-MM-dd}).",
                    ErrorType.Validation));

        var session = EcuNexo.Platform.Core.Training.TrainingSession.Schedule(
            _idGenerator.NewId(),
            command.CustomerId,
            command.LicenseGrantId,
            command.Topic,
            command.Kind,
            command.Modality,
            command.DurationHours,
            command.ScheduledAt,
            command.CreatedByOperatorId,
            command.AttendeeEmails,
            command.Notes);

        _sessions.Add(session);
        await _uow.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new ScheduleTrainingResponse(
            session.Id,
            session.CustomerId,
            session.Topic,
            session.Status.ToString(),
            session.ScheduledAt,
            session.AttendeeEmails));
    }
}
