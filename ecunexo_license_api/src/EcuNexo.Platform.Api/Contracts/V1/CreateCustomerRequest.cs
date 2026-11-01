using EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record CreateCustomerRequest(
    string LegalName,
    LicensingDeploymentMode DeploymentMode = LicensingDeploymentMode.CloudShared,
    string CountryCode = "EC",
    string? TradeName = null,
    string? TaxId = null,
    string? ContactName = null,
    string? ContactEmail = null,
    string? ContactPhone = null,
    string? Notes = null)
{
    public CreateCustomerCommand ToCommand(Guid requestedByOperatorId) =>
        new(
            LegalName,
            DeploymentMode,
            CountryCode,
            TradeName,
            TaxId,
            ContactName,
            ContactEmail,
            ContactPhone,
            Notes,
            requestedByOperatorId);
}
