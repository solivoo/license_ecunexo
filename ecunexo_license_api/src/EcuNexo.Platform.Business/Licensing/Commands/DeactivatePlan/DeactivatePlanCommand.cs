using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Commands.DeactivatePlan;

public sealed record DeactivatePlanCommand(string Code) : ICommand<DeactivatePlanResponse>;

public sealed record DeactivatePlanResponse(string Code, bool IsActive);

public sealed class DeactivatePlanHandler : ICommandHandler<DeactivatePlanCommand, DeactivatePlanResponse>
{
    private readonly ILicensingPlanRepository _plans;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public DeactivatePlanHandler(ILicensingPlanRepository plans, ILicensingUnitOfWork unitOfWork)
    {
        _plans = plans;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DeactivatePlanResponse>> Handle(DeactivatePlanCommand command, CancellationToken ct)
    {
        var plan = await _plans.GetByCodeTrackingAsync(command.Code, ct).ConfigureAwait(false);
        if (plan is null)
        {
            return Result.Failure<DeactivatePlanResponse>(
                new Error("plan.deactivate.not_found", "Plan no encontrado.", ErrorType.NotFound));
        }

        plan.Deactivate();
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new DeactivatePlanResponse(plan.Code, plan.IsActive));
    }
}
