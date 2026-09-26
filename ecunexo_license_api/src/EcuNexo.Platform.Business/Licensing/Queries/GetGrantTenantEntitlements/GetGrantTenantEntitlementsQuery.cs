using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;

public sealed record GetGrantTenantEntitlementsQuery(Guid GrantId, Guid TenantId)
    : IQuery<GrantTenantEntitlementsResponse>;

public sealed record GrantTenantEntitlementsResponse(
    Guid GrantId,
    Guid TenantId,
    string TenantName,
    bool HasOverride,
    IReadOnlyList<string> BaseEnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? BaseModuleEntitlements,
    int BaseEntitlementsVersion,
    IReadOnlyList<string> EffectiveEnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? EffectiveModuleEntitlements)
{
    public static GrantTenantEntitlementsResponse From(LicenseGrant grant, LicenseGrantTenant tenant) =>
        new(
            grant.Id,
            tenant.TenantId,
            tenant.TenantName,
            tenant.HasOverride,
            grant.EnabledModuleCodes,
            grant.ModuleEntitlements,
            grant.EntitlementsVersion,
            tenant.HasOverride ? tenant.EnabledModuleCodes : grant.EnabledModuleCodes,
            tenant.HasOverride ? tenant.ModuleEntitlements : grant.ModuleEntitlements);
}
