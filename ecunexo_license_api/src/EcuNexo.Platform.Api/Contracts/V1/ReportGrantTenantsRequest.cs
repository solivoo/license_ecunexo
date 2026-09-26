using EcuNexo.Platform.Business.Licensing.Commands.ReportGrantTenants;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record ReportedGrantTenantRequest(Guid TenantId, string Name);

public sealed record ReportGrantTenantsRequest(IReadOnlyList<ReportedGrantTenantRequest> Tenants)
{
    public ReportGrantTenantsCommand ToCommand(Guid grantId) =>
        new(
            grantId,
            Tenants?.Select(t => new ReportedGrantTenant(t.TenantId, t.Name)).ToList() ?? []);
}
