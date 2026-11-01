using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListLicensingCustomers;

public sealed record ListLicensingCustomersQuery : IQuery<ListLicensingCustomersResponse>;

public sealed record ListLicensingCustomersResponse(IReadOnlyList<LicensingCustomerListItem> Items);

public sealed record LicensingCustomerListItem(
    Guid Id,
    string LegalName,
    string? TradeName,
    string? TaxId,
    string? ContactEmail,
    string Status,
    int LicensesIssued,
    int ActiveLicenses,
    DateTimeOffset? LastLicenseIssuedAtUtc,
    string DeploymentMode = "CloudShared");
