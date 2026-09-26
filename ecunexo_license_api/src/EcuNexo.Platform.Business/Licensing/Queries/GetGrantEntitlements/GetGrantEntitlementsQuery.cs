using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetGrantEntitlements;

public sealed record GetGrantEntitlementsQuery(Guid GrantId) : IQuery<GrantEntitlementsResponse>;

/// <summary>Estado de módulos/entitlements de una licencia; lo consumen el panel y el tenant.</summary>
public sealed record GrantEntitlementsResponse(
    Guid GrantId,
    int EntitlementsVersion,
    string DeploymentMode,
    string Status,
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements,
    DateTimeOffset? UpdatedAtUtc,
    bool AppliedToTenant);

public sealed class GetGrantEntitlementsHandler
    : IQueryHandler<GetGrantEntitlementsQuery, GrantEntitlementsResponse>
{
    private readonly ILicenseGrantRepository _grants;

    public GetGrantEntitlementsHandler(ILicenseGrantRepository grants) => _grants = grants;

    public async Task<Result<GrantEntitlementsResponse>> Handle(
        GetGrantEntitlementsQuery query,
        CancellationToken ct)
    {
        var grant = await _grants.GetByIdAsync(query.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<GrantEntitlementsResponse>(
                new Error("license.entitlements.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        return Result.Success(new GrantEntitlementsResponse(
            grant.Id,
            grant.EntitlementsVersion,
            grant.DeploymentMode.ToString(),
            grant.Status.ToString(),
            grant.EnabledModuleCodes,
            grant.ModuleEntitlements,
            grant.EntitlementsUpdatedAtUtc,
            AppliedToTenant: false));
    }
}
