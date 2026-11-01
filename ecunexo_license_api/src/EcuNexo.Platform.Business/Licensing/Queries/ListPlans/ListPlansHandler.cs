using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListPlans;

public sealed class ListPlansHandler : IQueryHandler<ListPlansQuery, IReadOnlyList<ListPlansItem>>
{
    private readonly ILicensingPlanRepository _plans;

    public ListPlansHandler(ILicensingPlanRepository plans) => _plans = plans;

    public async Task<Result<IReadOnlyList<ListPlansItem>>> Handle(ListPlansQuery query, CancellationToken ct)
    {
        var plans = query.IncludeInactive
            ? await _plans.ListAllAsync(ct).ConfigureAwait(false)
            : await _plans.ListAsync(ct).ConfigureAwait(false);

        var items = plans.Select(p => new ListPlansItem(
            p.Code,
            p.DisplayName,
            p.Description,
            p.MaxTenantsDefault,
            p.MaxUsersDefault,
            p.MaxWarehousesDefault,
            p.EnabledModuleCodesDefault,
            p.ModuleEntitlementsDefault,
            p.SuggestedPriceUsdMonthly,
            p.SortOrder,
            p.IsActive,
            p.UpdatedAt)).ToList();

        return Result.Success<IReadOnlyList<ListPlansItem>>(items);
    }
}
