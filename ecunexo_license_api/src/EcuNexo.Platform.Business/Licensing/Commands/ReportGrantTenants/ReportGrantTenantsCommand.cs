using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Commands.ReportGrantTenants;

public sealed record ReportedGrantTenant(Guid TenantId, string Name);

public sealed record ReportGrantTenantsCommand(
    Guid GrantId,
    IReadOnlyList<ReportedGrantTenant> Tenants) : ICommand<ReportGrantTenantsResponse>;

public sealed record ReportGrantTenantsResponse(Guid GrantId, int Tenants);
