using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;

public sealed record CreateCustomerCommand(
    string LegalName,
    LicensingDeploymentMode DeploymentMode,
    string CountryCode,
    string? TradeName,
    string? TaxId,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    string? Notes,
    Guid RequestedByOperatorId)
    : ICommand<CreateCustomerResponse>;

public sealed record CreateCustomerResponse(
    Guid Id,
    string LegalName,
    string? TradeName,
    string? TaxId,
    string? ContactEmail,
    string CountryCode,
    string DeploymentMode,
    string Status);
