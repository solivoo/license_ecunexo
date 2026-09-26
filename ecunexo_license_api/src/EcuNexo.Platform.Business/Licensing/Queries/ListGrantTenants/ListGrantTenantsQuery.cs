using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListGrantTenants;

public sealed record ListGrantTenantsQuery(Guid GrantId) : IQuery<IReadOnlyList<GrantTenantListItem>>;

public sealed record GrantTenantListItem(
    Guid TenantId,
    string Name,
    bool HasOverride,
    int OverrideVersion,
    DateTimeOffset ReportedAtUtc,
    DateTimeOffset? OverrideUpdatedAtUtc);
