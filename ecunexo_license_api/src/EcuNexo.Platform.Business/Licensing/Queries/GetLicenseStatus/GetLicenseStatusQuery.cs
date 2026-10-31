using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetLicenseStatus;

public sealed record GetLicenseStatusQuery(Guid GrantId) : IQuery<LicenseStatusResponse>;

public sealed record LicenseStatusResponse(
    Guid GrantId,
    Guid? SupersedesGrantId,
    string Status,
    DateTimeOffset ExpiresAtUtc,
    bool IsAllowed,
    DateTimeOffset? RevokedAtUtc,
    int EntitlementsVersion = 1,
    IReadOnlyList<string>? EnabledModuleCodes = null,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements = null,
    int? MaxTenants = null,
    int? MaxUsers = null,
    int? MaxWarehouses = null,
    string? PlanCode = null,
    string? PlanLabel = null,
    int? OnlineValidationIntervalDays = null,
    Guid? SuccessorGrantId = null,
    string? SuccessorStatus = null,
    DateTimeOffset? SuccessorExpiresAtUtc = null,
    string? SuccessorPlanCode = null,
    string? SuccessorPlanLabel = null,
    int? SuccessorMaxTenants = null,
    int? SuccessorMaxUsers = null,
    int? SuccessorMaxWarehouses = null,
    int? SuccessorOnlineValidationIntervalDays = null,
    IReadOnlyList<string>? SuccessorEnabledModuleCodes = null,
    IReadOnlyList<ModuleEntitlement>? SuccessorModuleEntitlements = null);

public sealed class GetLicenseStatusHandler : IQueryHandler<GetLicenseStatusQuery, LicenseStatusResponse>
{
    private readonly ILicenseGrantRepository _grants;

    public GetLicenseStatusHandler(ILicenseGrantRepository grants) => _grants = grants;

    public async Task<Result<LicenseStatusResponse>> Handle(GetLicenseStatusQuery query, CancellationToken ct)
    {
        var grant = await _grants.GetByIdAsync(query.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<LicenseStatusResponse>(
                new Error("license.status.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        var utcNow = DateTimeOffset.UtcNow;
        var status = grant.Status.ToString();
        var allowed = grant.Status == LicenseGrantStatus.Active && utcNow < grant.ExpiresAtUtc;

        LicenseGrant? successor = null;
        if (grant.Status == LicenseGrantStatus.Revoked || !allowed)
        {
            successor = await _grants.FindActiveSuccessorBySupersededGrantIdAsync(grant.Id, ct).ConfigureAwait(false);
            if (successor is not null && successor.Status == LicenseGrantStatus.Active && utcNow < successor.ExpiresAtUtc)
            {
                allowed = true;
            }
        }

        return Result.Success(new LicenseStatusResponse(
            grant.Id,
            grant.SupersedesGrantId,
            status,
            grant.ExpiresAtUtc,
            allowed,
            grant.RevokedAtUtc,
            grant.EntitlementsVersion,
            grant.EnabledModuleCodes,
            grant.ModuleEntitlements,
            grant.MaxTenants,
            grant.MaxUsers,
            grant.MaxWarehouses,
            grant.PlanCode,
            grant.PlanLabel,
            grant.OnlineValidationIntervalDays,
            successor?.Id,
            successor?.Status.ToString(),
            successor?.ExpiresAtUtc,
            successor?.PlanCode,
            successor?.PlanLabel,
            successor?.MaxTenants,
            successor?.MaxUsers,
            successor?.MaxWarehouses,
            successor?.OnlineValidationIntervalDays,
            successor?.EnabledModuleCodes,
            successor?.ModuleEntitlements));
    }
}
