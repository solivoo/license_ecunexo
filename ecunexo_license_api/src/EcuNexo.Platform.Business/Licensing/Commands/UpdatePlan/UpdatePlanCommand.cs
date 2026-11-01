using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdatePlan;

public sealed record UpdatePlanCommand(
    string Code,
    string? DisplayName,
    string? Description,
    int? MaxTenantsDefault,
    int? MaxUsersDefault,
    int? MaxWarehousesDefault,
    IReadOnlyList<string>? EnabledModuleCodesDefault,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsDefault,
    decimal? SuggestedPriceUsdMonthly,
    int? SortOrder) : ICommand<UpdatePlanResponse>;

public sealed record UpdatePlanResponse(string Code, string DisplayName);
