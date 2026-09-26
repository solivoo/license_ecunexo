using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantEntitlements;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record UpdateGrantEntitlementsRequest(
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements,
    string? Reason = null)
{
    public UpdateGrantEntitlementsCommand ToCommand(Guid grantId, Guid operatorId) =>
        new(grantId, operatorId, EnabledModuleCodes, ModuleEntitlements, Reason);
}
