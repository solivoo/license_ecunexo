using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Training.Commands.CancelTraining;

public sealed record CancelTrainingCommand(Guid Id) : ICommand<CancelTrainingResponse>;

public sealed record CancelTrainingResponse(Guid Id, string Status);

public sealed class CancelTrainingHandler : ICommandHandler<CancelTrainingCommand, CancelTrainingResponse>
{
    private readonly ITrainingSessionRepository _sessions;
    private readonly ILicensingUnitOfWork _uow;

    public CancelTrainingHandler(ITrainingSessionRepository sessions, ILicensingUnitOfWork uow)
    {
        _sessions = sessions;
        _uow = uow;
    }

    public async Task<Result<CancelTrainingResponse>> Handle(CancelTrainingCommand command, CancellationToken ct)
    {
        var session = await _sessions.GetByIdAsync(command.Id, ct).ConfigureAwait(false);

        if (session is null)
            return Result.Failure<CancelTrainingResponse>(
                new Error("training.not_found", "Sesión de capacitación no encontrada.", ErrorType.NotFound));

        session.Cancel();
        await _uow.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new CancelTrainingResponse(session.Id, session.Status.ToString()));
    }
}
