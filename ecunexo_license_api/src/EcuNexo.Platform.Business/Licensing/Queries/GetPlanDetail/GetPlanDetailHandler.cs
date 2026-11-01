using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetPlanDetail;

public sealed class GetPlanDetailHandler : IQueryHandler<GetPlanDetailQuery, PlanDetailResponse?>
{
    private readonly ILicensingPlanRepository _plans;

    public GetPlanDetailHandler(ILicensingPlanRepository plans) => _plans = plans;

    public async Task<Result<PlanDetailResponse?>> Handle(GetPlanDetailQuery query, CancellationToken ct)
    {
        var plan = await _plans.GetByCodeAnyStatusAsync(query.PlanCode, ct).ConfigureAwait(false);
        if (plan is null)
        {
            return Result.Success<PlanDetailResponse?>(null);
        }

        return Result.Success<PlanDetailResponse?>(new PlanDetailResponse(
            plan.Code,
            plan.DisplayName,
            plan.Description,
            plan.MaxTenantsDefault,
            plan.MaxUsersDefault,
            plan.MaxWarehousesDefault,
            plan.EnabledModuleCodesDefault,
            plan.ModuleEntitlementsDefault,
            plan.SuggestedPriceUsdMonthly,
            plan.SortOrder,
            plan.IsActive,
            plan.CreatedAt,
            plan.UpdatedAt));
    }
}
