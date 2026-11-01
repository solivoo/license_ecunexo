using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetPlanDetail;

public sealed record GetPlanDetailQuery(string PlanCode) : IQuery<PlanDetailResponse?>;

public sealed record PlanDetailResponse(
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
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);
