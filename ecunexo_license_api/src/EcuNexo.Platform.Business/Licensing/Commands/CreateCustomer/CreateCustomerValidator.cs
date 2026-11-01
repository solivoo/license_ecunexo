using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;

public sealed class CreateCustomerValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.LegalName)
            .NotEmpty()
            .MaximumLength(LicensingCustomer.LegalNameMaxLength);

        RuleFor(x => x.CountryCode)
            .NotEmpty()
            .Length(LicensingCustomer.CountryCodeLength);

        RuleFor(x => x.DeploymentMode)
            .IsInEnum();

        RuleFor(x => x.TradeName)
            .MaximumLength(LicensingCustomer.TradeNameMaxLength)
            .When(x => !string.IsNullOrWhiteSpace(x.TradeName));

        RuleFor(x => x.TaxId)
            .MaximumLength(LicensingCustomer.TaxIdMaxLength)
            .When(x => !string.IsNullOrWhiteSpace(x.TaxId));

        RuleFor(x => x.ContactName)
            .MaximumLength(LicensingCustomer.ContactNameMaxLength)
            .When(x => !string.IsNullOrWhiteSpace(x.ContactName));

        RuleFor(x => x.ContactEmail)
            .EmailAddress()
            .MaximumLength(LicensingCustomer.ContactEmailMaxLength)
            .When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));

        RuleFor(x => x.ContactPhone)
            .MaximumLength(LicensingCustomer.ContactPhoneMaxLength)
            .When(x => !string.IsNullOrWhiteSpace(x.ContactPhone));

        RuleFor(x => x.RequestedByOperatorId).NotEmpty();
    }
}
