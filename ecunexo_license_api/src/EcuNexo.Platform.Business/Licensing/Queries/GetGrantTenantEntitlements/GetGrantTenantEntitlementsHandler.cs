using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;

public sealed class GetGrantTenantEntitlementsHandler
    : IQueryHandler<GetGrantTenantEntitlementsQuery, GrantTenantEntitlementsResponse>
{
    private readonly ILicenseGrantRepository _grants;

    public GetGrantTenantEntitlementsHandler(ILicenseGrantRepository grants) => _grants = grants;

    public async Task<Result<GrantTenantEntitlementsResponse>> Handle(
        GetGrantTenantEntitlementsQuery query,
        CancellationToken ct)
    {
        var grant = await _grants.GetByIdAsync(query.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error("license.tenant.entitlements.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        var tenants = await _grants.ListTenantsAsync(query.GrantId, ct).ConfigureAwait(false);
        var tenant = tenants.FirstOrDefault(t => t.TenantId == query.TenantId);
        if (tenant is null)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error("license.tenant.entitlements.tenant_not_found", "Empresa no encontrada para la licencia.", ErrorType.NotFound));
        }

        return Result.Success(GrantTenantEntitlementsResponse.From(grant, tenant));
    }
}
