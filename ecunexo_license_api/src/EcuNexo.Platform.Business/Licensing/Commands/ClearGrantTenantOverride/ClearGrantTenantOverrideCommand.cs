using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;

namespace EcuNexo.Platform.Business.Licensing.Commands.ClearGrantTenantOverride;

public sealed record ClearGrantTenantOverrideCommand(
    Guid GrantId,
    Guid TenantId,
    Guid OperatorId,
    string? Reason = null) : ICommand<GrantTenantEntitlementsResponse>;
