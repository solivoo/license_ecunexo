using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.ClearGrantTenantOverride;

public sealed class ClearGrantTenantOverrideValidator
    : AbstractValidator<ClearGrantTenantOverrideCommand>
{
    public ClearGrantTenantOverrideValidator()
    {
        RuleFor(x => x.GrantId).NotEmpty().WithMessage("La licencia es obligatoria.");
        RuleFor(x => x.TenantId).NotEmpty().WithMessage("La empresa es obligatoria.");
        RuleFor(x => x.OperatorId).NotEmpty().WithMessage("El operador es obligatorio.");
        RuleFor(x => x.Reason)
            .MaximumLength(300)
            .WithMessage("El motivo no puede superar 300 caracteres.");
    }
}
