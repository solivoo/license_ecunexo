using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantEntitlements;

public sealed class UpdateGrantEntitlementsValidator : AbstractValidator<UpdateGrantEntitlementsCommand>
{
    public UpdateGrantEntitlementsValidator()
    {
        RuleFor(x => x.GrantId).NotEmpty().WithMessage("La licencia es obligatoria.");
        RuleFor(x => x.IssuedByOperatorId).NotEmpty().WithMessage("El operador es obligatorio.");
        RuleFor(x => x.EnabledModuleCodes).NotEmpty().WithMessage("Debe indicarse al menos un módulo.");
        RuleFor(x => x.Reason)
            .MaximumLength(300)
            .WithMessage("El motivo no puede superar 300 caracteres.");
    }
}
