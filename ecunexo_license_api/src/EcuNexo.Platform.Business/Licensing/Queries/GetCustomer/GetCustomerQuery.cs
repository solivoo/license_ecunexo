using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;

public sealed record GetCustomerQuery(Guid CustomerId) : IQuery<CustomerDetailResponse?>;

public sealed record CustomerDetailResponse(
    Guid Id,
    string LegalName,
    string? TradeName,
    string? TaxId,
    string CountryCode,
    string DeploymentMode,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    string? Notes,
    string Status);
