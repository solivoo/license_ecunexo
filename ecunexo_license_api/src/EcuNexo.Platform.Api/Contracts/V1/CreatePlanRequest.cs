using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;

namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record CreatePlanRequest(
    string Code,
    string DisplayName,
    int MaxTenantsDefault,
    int MaxUsersDefault,
    int MaxWarehousesDefault,
    IReadOnlyList<string> EnabledModuleCodesDefault,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsDefault = null,
    int SortOrder = 100,
    decimal? SuggestedPriceUsdMonthly = null,
    string? Description = null)
{
    public CreatePlanCommand ToCommand() =>
        new(
            Code,
            DisplayName,
            MaxTenantsDefault,
            MaxUsersDefault,
            MaxWarehousesDefault,
            EnabledModuleCodesDefault,
            ModuleEntitlementsDefault,
            SortOrder,
            SuggestedPriceUsdMonthly,
            Description);
}
