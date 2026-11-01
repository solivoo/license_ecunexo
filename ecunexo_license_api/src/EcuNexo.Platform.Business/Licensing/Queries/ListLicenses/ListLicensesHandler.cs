using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListLicenses;

public sealed class ListLicensesHandler : IQueryHandler<ListLicensesQuery, ListLicensesResponse>
{
    private readonly ILicenseGrantRepository _grants;

    public ListLicensesHandler(ILicenseGrantRepository grants) => _grants = grants;

    public async Task<Result<ListLicensesResponse>> Handle(ListLicensesQuery query, CancellationToken ct)
    {
        var rows = await _grants.ListAsync(ct).ConfigureAwait(false);
        var items = rows.Select(row => new LicenseListItem(
            row.Id,
            row.CustomerId,
            row.CustomerLegalName,
            row.CustomerTradeName,
            row.OwnerEmailNormalized,
            row.PlanCode,
            row.PlanLabel,
            MapStatus(row.Status),
            row.IssuedAtUtc,
            row.ExpiresAtUtc,
            row.ProvisioningSlotsRemaining,
            row.MaxTenants,
            row.IssuedByOperatorName,
            row.SupersedesGrantId,
            row.OnlineValidationIntervalDays,
            row.Generation,
            MapReissueKind(row.ReissueKind),
            row.PreviousPlanCode,
            row.PreviousPlanLabel,
            row.MaxUsers,
            row.MaxWarehouses,
            row.EnabledModuleCodes,
            row.ModuleEntitlements,
            row.DeploymentMode.ToString())).ToList();

        return Result.Success(new ListLicensesResponse(items));
    }

    private static string MapStatus(LicenseGrantStatus status) => status switch
    {
        LicenseGrantStatus.Active => "Active",
        LicenseGrantStatus.Revoked => "Revoked",
        LicenseGrantStatus.Exhausted => "Exhausted",
        _ => status.ToString(),
    };

    private static string? MapReissueKind(LicenseReissueKind? kind) => kind switch
    {
        LicenseReissueKind.Renew => "Renew",
        LicenseReissueKind.Expand => "Expand",
        _ => null,
    };
}
