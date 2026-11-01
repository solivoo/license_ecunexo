using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;

public sealed class CreatePlanHandler : ICommandHandler<CreatePlanCommand, CreatePlanResponse>
{
    private readonly IValidator<CreatePlanCommand> _validator;
    private readonly ILicensingPlanRepository _plans;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public CreatePlanHandler(
        IValidator<CreatePlanCommand> validator,
        ILicensingPlanRepository plans,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _plans = plans;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CreatePlanResponse>> Handle(CreatePlanCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<CreatePlanResponse>(
                new Error("plan.create.validation", message, ErrorType.Validation));
        }

        var code = command.Code.Trim().ToLowerInvariant();
        if (await _plans.ExistsByCodeAsync(code, ct).ConfigureAwait(false))
        {
            return Result.Failure<CreatePlanResponse>(
                new Error("plan.create.duplicate", $"Ya existe un plan con el código «{code}».", ErrorType.Conflict));
        }

        // Validar dependencias de módulos
        var depErrors = ModuleDependencyGraph.Validate(command.EnabledModuleCodesDefault);
        if (depErrors.Count > 0)
        {
            return Result.Failure<CreatePlanResponse>(
                new Error("plan.create.module_deps", string.Join(" ", depErrors), ErrorType.Validation));
        }

        // Validar consistencia de tiers
        if (command.ModuleEntitlementsDefault is not null && command.ModuleEntitlementsDefault.Count > 0)
        {
            var tierErrors = ModuleDependencyGraph.ValidateTierConsistency(command.ModuleEntitlementsDefault);
            if (tierErrors.Count > 0)
            {
                return Result.Failure<CreatePlanResponse>(
                    new Error("plan.create.tier_consistency", string.Join(" ", tierErrors), ErrorType.Validation));
            }
        }

        var planCreated = LicensingPlan.Create(
            code,
            command.DisplayName,
            command.MaxTenantsDefault,
            command.MaxUsersDefault,
            command.MaxWarehousesDefault,
            command.EnabledModuleCodesDefault,
            command.ModuleEntitlementsDefault,
            command.SortOrder,
            command.SuggestedPriceUsdMonthly,
            command.Description);

        if (planCreated.IsFailure)
        {
            return Result.Failure<CreatePlanResponse>(planCreated.Error!);
        }

        await _plans.AddAsync(planCreated.Value!, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new CreatePlanResponse(
            planCreated.Value!.Code,
            planCreated.Value.DisplayName));
    }
}
