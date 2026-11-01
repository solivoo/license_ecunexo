using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;

public sealed class CreatePlanValidator : AbstractValidator<CreatePlanCommand>
{
    public CreatePlanValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty()
            .MaximumLength(LicensingPlan.CodeMaxLength)
            .Matches(@"^[a-z0-9\-]+$")
            .WithMessage("El código solo permite minúsculas, números y guiones.");

        RuleFor(x => x.DisplayName)
            .NotEmpty()
            .MaximumLength(LicensingPlan.DisplayNameMaxLength);

        RuleFor(x => x.MaxTenantsDefault)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Debe permitir al menos una empresa.");

        RuleFor(x => x.MaxUsersDefault).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxWarehousesDefault).GreaterThanOrEqualTo(0);

        RuleFor(x => x.EnabledModuleCodesDefault)
            .NotEmpty()
            .Must(modules => modules.Any(m => string.Equals(
                m.Trim(), TenantModuleCodes.Identity, StringComparison.OrdinalIgnoreCase)))
            .WithMessage("El módulo 'identity' es obligatorio.");

        RuleFor(x => x.EnabledModuleCodesDefault)
            .Must(modules =>
            {
                var errors = ModuleDependencyGraph.Validate(modules);
                return errors.Count == 0;
            })
            .WithMessage(command =>
            {
                var errors = ModuleDependencyGraph.Validate(command.EnabledModuleCodesDefault);
                return string.Join(" ", errors);
            });

        RuleFor(x => x)
            .Must(command =>
            {
                if (command.ModuleEntitlementsDefault is null || command.ModuleEntitlementsDefault.Count == 0)
                {
                    return true;
                }

                var errors = ModuleDependencyGraph.ValidateTierConsistency(command.ModuleEntitlementsDefault);
                return errors.Count == 0;
            })
            .WithMessage(command =>
            {
                if (command.ModuleEntitlementsDefault is null)
                {
                    return string.Empty;
                }

                var errors = ModuleDependencyGraph.ValidateTierConsistency(command.ModuleEntitlementsDefault);
                return string.Join(" ", errors);
            });
    }
}
