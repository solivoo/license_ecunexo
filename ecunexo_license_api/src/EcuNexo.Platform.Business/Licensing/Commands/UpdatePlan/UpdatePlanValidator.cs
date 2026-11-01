using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;

public sealed class UpdatePlanValidator : AbstractValidator<UpdatePlanCommand>
{
    public UpdatePlanValidator()
    {
        RuleFor(x => x.Code).NotEmpty();

        RuleFor(x => x.DisplayName)
            .MaximumLength(120)
            .When(x => x.DisplayName is not null);

        RuleFor(x => x.MaxTenantsDefault)
            .GreaterThanOrEqualTo(1)
            .When(x => x.MaxTenantsDefault.HasValue);

        RuleFor(x => x.MaxUsersDefault)
            .GreaterThanOrEqualTo(0)
            .When(x => x.MaxUsersDefault.HasValue);

        RuleFor(x => x.MaxWarehousesDefault)
            .GreaterThanOrEqualTo(0)
            .When(x => x.MaxWarehousesDefault.HasValue);

        RuleFor(x => x.EnabledModuleCodesDefault)
            .Must(modules => modules!.Any(m => string.Equals(
                m.Trim(), TenantModuleCodes.Identity, StringComparison.OrdinalIgnoreCase)))
            .WithMessage("El módulo 'identity' es obligatorio.")
            .When(x => x.EnabledModuleCodesDefault is not null && x.EnabledModuleCodesDefault.Count > 0);

        RuleFor(x => x.EnabledModuleCodesDefault)
            .Must(modules =>
            {
                var errors = ModuleDependencyGraph.Validate(modules!);
                return errors.Count == 0;
            })
            .WithMessage(command =>
            {
                if (command.EnabledModuleCodesDefault is null) return string.Empty;
                var errors = ModuleDependencyGraph.Validate(command.EnabledModuleCodesDefault);
                return string.Join(" ", errors);
            })
            .When(x => x.EnabledModuleCodesDefault is not null && x.EnabledModuleCodesDefault.Count > 0);

        RuleFor(x => x)
            .Must(command =>
            {
                if (command.ModuleEntitlementsDefault is null || command.ModuleEntitlementsDefault.Count == 0)
                    return true;
                var errors = ModuleDependencyGraph.ValidateTierConsistency(command.ModuleEntitlementsDefault);
                return errors.Count == 0;
            })
            .WithMessage(command =>
            {
                if (command.ModuleEntitlementsDefault is null) return string.Empty;
                var errors = ModuleDependencyGraph.ValidateTierConsistency(command.ModuleEntitlementsDefault);
                return string.Join(" ", errors);
            });
    }
}
