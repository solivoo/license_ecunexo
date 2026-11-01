using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListPlans;

public sealed record ListPlansQuery(bool IncludeInactive = false) : IQuery<IReadOnlyList<ListPlansItem>>;

public sealed record ListPlansItem(
    string Code,
    string DisplayName,
    string? Description,
    int MaxTenantsDefault,
    int MaxUsersDefault,
    int MaxWarehousesDefault,
    IReadOnlyList<string> EnabledModuleCodesDefault,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsDefault,
    decimal? SuggestedPriceUsdMonthly,
    int SortOrder,
    bool IsActive,
    DateTimeOffset? UpdatedAt);
