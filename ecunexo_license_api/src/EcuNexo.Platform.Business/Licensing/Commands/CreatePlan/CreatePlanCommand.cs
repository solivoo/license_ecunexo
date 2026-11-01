using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreatePlan;

public sealed record CreatePlanCommand(
    string Code,
    string DisplayName,
    int MaxTenantsDefault,
    int MaxUsersDefault,
    int MaxWarehousesDefault,
    IReadOnlyList<string> EnabledModuleCodesDefault,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsDefault,
    int SortOrder,
    decimal? SuggestedPriceUsdMonthly = null,
    string? Description = null) : ICommand<CreatePlanResponse>;

public sealed record CreatePlanResponse(string Code, string DisplayName);
