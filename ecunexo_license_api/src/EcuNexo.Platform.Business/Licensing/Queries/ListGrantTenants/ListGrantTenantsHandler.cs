using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListGrantTenants;

public sealed class ListGrantTenantsHandler
    : IQueryHandler<ListGrantTenantsQuery, IReadOnlyList<GrantTenantListItem>>
{
    private readonly ILicenseGrantRepository _grants;

    public ListGrantTenantsHandler(ILicenseGrantRepository grants) => _grants = grants;

    public async Task<Result<IReadOnlyList<GrantTenantListItem>>> Handle(
        ListGrantTenantsQuery query,
        CancellationToken ct)
    {
        var tenants = await _grants.ListTenantsAsync(query.GrantId, ct).ConfigureAwait(false);

        var items = tenants
            .Select(t => new GrantTenantListItem(
                t.TenantId,
                t.TenantName,
                t.HasOverride,
                t.OverrideVersion,
                t.ReportedAtUtc,
                t.OverrideUpdatedAtUtc))
            .ToList();

        return Result.Success<IReadOnlyList<GrantTenantListItem>>(items);
    }
}
