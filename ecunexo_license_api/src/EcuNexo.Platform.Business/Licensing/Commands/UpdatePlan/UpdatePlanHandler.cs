using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;

public sealed class UpdatePlanHandler : ICommandHandler<UpdatePlanCommand, UpdatePlanResponse>
{
    private readonly IValidator<UpdatePlanCommand> _validator;
    private readonly ILicensingPlanRepository _plans;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public UpdatePlanHandler(
        IValidator<UpdatePlanCommand> validator,
        ILicensingPlanRepository plans,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _plans = plans;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<UpdatePlanResponse>> Handle(UpdatePlanCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<UpdatePlanResponse>(
                new Error("plan.update.validation", message, ErrorType.Validation));
        }

        var plan = await _plans.GetByCodeTrackingAsync(command.Code, ct).ConfigureAwait(false);
        if (plan is null)
        {
            return Result.Failure<UpdatePlanResponse>(
                new Error("plan.update.not_found", "Plan no encontrado.", ErrorType.NotFound));
        }

        plan.Update(
            command.DisplayName,
            command.Description,
            command.MaxTenantsDefault,
            command.MaxUsersDefault,
            command.MaxWarehousesDefault,
            command.EnabledModuleCodesDefault,
            command.ModuleEntitlementsDefault,
            command.SuggestedPriceUsdMonthly,
            command.SortOrder);

        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new UpdatePlanResponse(plan.Code, plan.DisplayName));
    }
}
