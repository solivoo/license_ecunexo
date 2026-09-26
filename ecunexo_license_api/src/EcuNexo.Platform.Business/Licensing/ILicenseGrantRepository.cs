using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing;

public interface ILicenseGrantRepository
{
    Task AddAsync(LicenseGrant grant, CancellationToken ct);

    Task AddEntitlementChangeAsync(LicenseGrantEntitlementChange change, CancellationToken ct);

    Task<IReadOnlyList<LicenseGrantTenant>> ListTenantsAsync(Guid grantId, CancellationToken ct);

    Task<LicenseGrantTenant?> GetTenantForUpdateAsync(Guid grantId, Guid tenantId, CancellationToken ct);

    Task AddTenantAsync(LicenseGrantTenant tenant, CancellationToken ct);

    Task<bool> ExistsActiveOwnerEmailAsync(string ownerEmailNormalized, CancellationToken ct);

    /// <summary>Igual que <see cref="ExistsActiveOwnerEmailAsync"/> pero ignorando el grant que se está reemitiendo.</summary>
    Task<bool> ExistsActiveOwnerEmailExceptAsync(
        string ownerEmailNormalized,
        Guid excludedGrantId,
        CancellationToken ct);

    Task<LicenseGrant?> GetActiveByCodeHashForUpdateAsync(string codeHash, DateTimeOffset utcNow, CancellationToken ct);

    Task<LicenseGrant?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<LicenseGrant?> GetByIdForUpdateAsync(Guid id, CancellationToken ct);

    Task<LicenseGrant?> FindLatestCurrentByCustomerAsync(Guid customerId, CancellationToken ct);

    Task<IReadOnlyList<LicenseGrant>> ListCurrentForUpdateByCustomerAsync(Guid customerId, CancellationToken ct);

    /// <summary>
    /// Revoca y libera el correo del titular en un commit propio. El índice único parcial
    /// solo suelta la entrada cuando la revocación queda confirmada.
    /// </summary>
    Task<int> RevokeForReissueAsync(
        Guid grantId,
        DateTimeOffset revokedAtUtc,
        Guid revokedByOperatorId,
        CancellationToken ct);

    Task AssignOwnerEmailAsync(Guid grantId, string ownerEmailNormalized, CancellationToken ct);

    /// <summary>Deshace una reemisión a medias: devuelve el grant anterior a su estado vigente.</summary>
    Task ReinstateAsync(
        Guid grantId,
        LicenseGrantStatus status,
        int provisioningSlotsRemaining,
        string ownerEmailNormalized,
        CancellationToken ct);

    /// <summary>Borra un grant recién insertado cuando la reemisión no pudo completarse.</summary>
    Task DeleteAsync(Guid grantId, CancellationToken ct);

    Task<IReadOnlyList<LicenseGrantListRow>> ListAsync(CancellationToken ct);
}

public sealed record LicenseGrantListRow(
    Guid Id,
    Guid CustomerId,
    string CustomerLegalName,
    string? CustomerTradeName,
    string? OwnerEmailNormalized,
    string PlanCode,
    string PlanLabel,
    LicenseGrantStatus Status,
    DateTimeOffset IssuedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    int ProvisioningSlotsRemaining,
    int MaxTenants,
    string IssuedByOperatorName,
    Guid? SupersedesGrantId,
    int OnlineValidationIntervalDays,
    int Generation,
    LicenseReissueKind? ReissueKind,
    string? PreviousPlanCode,
    string? PreviousPlanLabel);
