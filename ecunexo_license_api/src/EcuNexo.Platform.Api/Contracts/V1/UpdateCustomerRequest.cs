using EcuNexo.Platform.Business.Licensing.Commands.UpdateCustomer;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record UpdateCustomerRequest(
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
    public UpdateCustomerCommand ToCommand(Guid customerId, Guid requestedByOperatorId) =>
        new(
            customerId,
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
