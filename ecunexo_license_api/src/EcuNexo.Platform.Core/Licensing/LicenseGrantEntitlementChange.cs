using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;

namespace EcuNexo.Platform.Core.Licensing;

/// <summary>
/// Bitácora append-only de cambios de módulos/entitlements de una licencia cloud.
/// </summary>
public sealed class LicenseGrantEntitlementChange : Entity<Guid>
{
    public const int ReasonMaxLength = 300;

    private LicenseGrantEntitlementChange()
    {
        PreviousEnabledModuleCodes = [];
        NewEnabledModuleCodes = [];
    }

    public Guid GrantId { get; private set; }

    public Guid? TenantId { get; private set; }

    public string? TenantName { get; private set; }

    public IReadOnlyList<string> PreviousEnabledModuleCodes { get; private set; }

    public IReadOnlyList<string> NewEnabledModuleCodes { get; private set; }

    public IReadOnlyList<ModuleEntitlement>? PreviousEntitlements { get; private set; }

    public IReadOnlyList<ModuleEntitlement>? NewEntitlements { get; private set; }

    public string? Reason { get; private set; }

    public Guid ChangedByOperatorId { get; private set; }

    public DateTimeOffset ChangedAtUtc { get; private set; }

    public static Result<LicenseGrantEntitlementChange> Create(
        Guid id,
        Guid grantId,
        IReadOnlyList<string> previousEnabledModuleCodes,
        IReadOnlyList<string> newEnabledModuleCodes,
        IReadOnlyList<ModuleEntitlement>? previousEntitlements,
        IReadOnlyList<ModuleEntitlement>? newEntitlements,
        Guid changedByOperatorId,
        DateTimeOffset changedAtUtc,
        string? reason,
        Guid? tenantId = null,
        string? tenantName = null)
    {
        if (id == Guid.Empty || grantId == Guid.Empty)
        {
            return Result.Failure<LicenseGrantEntitlementChange>(
                new Error("license.entitlements.change.ids", "El identificador y la licencia son obligatorios.", ErrorType.Validation));
        }

        if (changedByOperatorId == Guid.Empty)
        {
            return Result.Failure<LicenseGrantEntitlementChange>(
                new Error("license.entitlements.change.operator", "El operador es obligatorio.", ErrorType.Validation));
        }

        var normalizedReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (normalizedReason is not null && normalizedReason.Length > ReasonMaxLength)
        {
            return Result.Failure<LicenseGrantEntitlementChange>(
                new Error("license.entitlements.change.reason_length", $"El motivo no puede superar {ReasonMaxLength} caracteres.", ErrorType.Validation));
        }

        var normalizedTenantName = string.IsNullOrWhiteSpace(tenantName) ? null : tenantName.Trim();
        if (normalizedTenantName is not null && normalizedTenantName.Length > LicenseGrantTenant.TenantNameMaxLength)
        {
            return Result.Failure<LicenseGrantEntitlementChange>(
                new Error(
                    "license.entitlements.change.tenant_name_length",
                    $"El nombre de la empresa no puede superar {LicenseGrantTenant.TenantNameMaxLength} caracteres.",
                    ErrorType.Validation));
        }

        return new LicenseGrantEntitlementChange
        {
            Id = id,
            GrantId = grantId,
            TenantId = tenantId,
            TenantName = normalizedTenantName,
            PreviousEnabledModuleCodes = previousEnabledModuleCodes,
            NewEnabledModuleCodes = newEnabledModuleCodes,
            PreviousEntitlements = previousEntitlements,
            NewEntitlements = newEntitlements,
            ChangedByOperatorId = changedByOperatorId,
            ChangedAtUtc = changedAtUtc,
            Reason = normalizedReason,
        };
    }
}
