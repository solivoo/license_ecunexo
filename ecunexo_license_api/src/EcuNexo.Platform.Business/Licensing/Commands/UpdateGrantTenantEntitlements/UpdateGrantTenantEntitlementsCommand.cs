using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantTenantEntitlements;

public sealed record UpdateGrantTenantEntitlementsCommand(
    Guid GrantId,
    Guid TenantId,
    Guid OperatorId,
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements,
    string? Reason = null) : ICommand<GrantTenantEntitlementsResponse>;
