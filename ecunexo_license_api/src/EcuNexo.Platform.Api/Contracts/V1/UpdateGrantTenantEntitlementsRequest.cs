using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantTenantEntitlements;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record UpdateGrantTenantEntitlementsRequest(
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements,
    string? Reason = null)
{
    public UpdateGrantTenantEntitlementsCommand ToCommand(Guid grantId, Guid tenantId, Guid operatorId) =>
        new(grantId, tenantId, operatorId, EnabledModuleCodes, ModuleEntitlements, Reason);
}
