using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantEntitlements;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantEntitlements;

public sealed record UpdateGrantEntitlementsCommand(
    Guid GrantId,
    Guid IssuedByOperatorId,
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements,
    string? Reason = null) : ICommand<GrantEntitlementsResponse>;
