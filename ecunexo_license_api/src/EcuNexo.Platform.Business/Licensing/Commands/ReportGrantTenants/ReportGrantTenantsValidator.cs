using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.ReportGrantTenants;

public sealed class ReportGrantTenantsValidator : AbstractValidator<ReportGrantTenantsCommand>
{
    public ReportGrantTenantsValidator()
    {
        RuleFor(x => x.GrantId).NotEmpty().WithMessage("La licencia es obligatoria.");
        RuleFor(x => x.Tenants).NotEmpty().WithMessage("Debe reportarse al menos una empresa.");

        RuleForEach(x => x.Tenants)
            .ChildRules(tenant =>
            {
                tenant.RuleFor(t => t.TenantId).NotEmpty().WithMessage("El identificador de la empresa es obligatorio.");
                tenant.RuleFor(t => t.Name)
                    .NotEmpty()
                    .WithMessage("El nombre de la empresa es obligatorio.")
                    .MaximumLength(LicenseGrantTenant.TenantNameMaxLength)
                    .WithMessage($"El nombre de la empresa no puede superar {LicenseGrantTenant.TenantNameMaxLength} caracteres.");
            })
            .When(x => x.Tenants is not null);
    }
}
