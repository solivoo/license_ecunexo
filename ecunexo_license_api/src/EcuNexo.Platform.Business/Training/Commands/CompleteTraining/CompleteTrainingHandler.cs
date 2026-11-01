using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Training.Commands.CompleteTraining;

public sealed record CompleteTrainingCommand(Guid Id) : ICommand<CompleteTrainingResponse>;

public sealed record CompleteTrainingResponse(Guid Id, string Status);

public sealed class CompleteTrainingHandler : ICommandHandler<CompleteTrainingCommand, CompleteTrainingResponse>
{
    private readonly ITrainingSessionRepository _sessions;
    private readonly ILicensingUnitOfWork _uow;

    public CompleteTrainingHandler(ITrainingSessionRepository sessions, ILicensingUnitOfWork uow)
    {
        _sessions = sessions;
        _uow = uow;
    }

    public async Task<Result<CompleteTrainingResponse>> Handle(CompleteTrainingCommand command, CancellationToken ct)
    {
        var session = await _sessions.GetByIdAsync(command.Id, ct).ConfigureAwait(false);

        if (session is null)
            return Result.Failure<CompleteTrainingResponse>(
                new Error("training.not_found", "Sesión de capacitación no encontrada.", ErrorType.NotFound));

        if (session.Status == EcuNexo.Platform.Core.Training.TrainingSessionStatus.Cancelled)
            return Result.Failure<CompleteTrainingResponse>(
                new Error("training.already_cancelled", "No se puede completar una sesión cancelada.", ErrorType.Validation));

        session.Complete();
        await _uow.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new CompleteTrainingResponse(session.Id, session.Status.ToString()));
    }
}
