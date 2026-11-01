using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateCustomer;

public sealed record UpdateCustomerCommand(
    Guid CustomerId,
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
    : ICommand<CustomerDetailResponse>;
