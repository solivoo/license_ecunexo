using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Licensing.Commands.ReissueLicense;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record ReissueLicenseRequest(
    int? ValidityDays = null,
    int? OnlineValidationIntervalDays = null,
    string? PlanCode = null,
    int? MaxUsersOverride = null,
    int? MaxWarehousesOverride = null,
    int? MaxTenantsOverride = null,
    IReadOnlyList<string>? EnabledModuleCodesOverride = null,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsOverride = null)
{
    public ReissueLicenseCommand ToCommand(Guid grantId, Guid operatorId) =>
        new(
            grantId,
            operatorId,
            ValidityDays,
            OnlineValidationIntervalDays,
            PlanCode,
            MaxUsersOverride,
            MaxWarehousesOverride,
            MaxTenantsOverride,
            EnabledModuleCodesOverride,
            ModuleEntitlementsOverride);
}
