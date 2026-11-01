using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListLicensingCustomers;

public sealed class ListLicensingCustomersHandler
    : IQueryHandler<ListLicensingCustomersQuery, ListLicensingCustomersResponse>
{
    private readonly ILicensingCustomerRepository _customers;

    public ListLicensingCustomersHandler(ILicensingCustomerRepository customers) => _customers = customers;

    public async Task<Result<ListLicensingCustomersResponse>> Handle(
        ListLicensingCustomersQuery query,
        CancellationToken ct)
    {
        var rows = await _customers.ListWithLicenseStatsAsync(ct).ConfigureAwait(false);
        var items = rows.Select(row => new LicensingCustomerListItem(
            row.Id,
            row.LegalName,
            row.TradeName,
            row.TaxId,
            row.ContactEmail,
            MapStatus(row.Status),
            row.LicensesIssued,
            row.ActiveLicenses,
            row.LastLicenseIssuedAtUtc,
            row.DeploymentMode.ToString())).ToList();

        return Result.Success(new ListLicensingCustomersResponse(items));
    }

    private static string MapStatus(LicensingCustomerStatus status) => status switch
    {
        LicensingCustomerStatus.Active => "Active",
        LicensingCustomerStatus.Suspended => "Suspended",
        _ => status.ToString(),
    };
}
