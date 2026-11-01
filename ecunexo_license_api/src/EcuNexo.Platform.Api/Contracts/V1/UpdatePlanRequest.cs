using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record UpdatePlanRequest(
    string? DisplayName = null,
    string? Description = null,
    int? MaxTenantsDefault = null,
    int? MaxUsersDefault = null,
    int? MaxWarehousesDefault = null,
    IReadOnlyList<string>? EnabledModuleCodesDefault = null,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsDefault = null,
    decimal? SuggestedPriceUsdMonthly = null,
    int? SortOrder = null)
{
    public UpdatePlanCommand ToCommand(string code) =>
        new(
            code,
            DisplayName,
            Description,
            MaxTenantsDefault,
            MaxUsersDefault,
            MaxWarehousesDefault,
            EnabledModuleCodesDefault,
            ModuleEntitlementsDefault,
            SuggestedPriceUsdMonthly,
            SortOrder);
}
