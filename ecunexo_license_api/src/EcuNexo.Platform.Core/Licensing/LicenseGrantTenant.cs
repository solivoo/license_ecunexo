using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;

namespace EcuNexo.Platform.Core.Licensing;

public sealed class LicenseGrantTenant : Entity<Guid>
{
    public const int TenantNameMaxLength = 200;

    private LicenseGrantTenant()
    {
        TenantName = string.Empty;
        EnabledModuleCodes = [];
    }

    public Guid GrantId { get; private set; }

    public Guid TenantId { get; private set; }

    public string TenantName { get; private set; }

    public bool HasOverride { get; private set; }

    public List<string> EnabledModuleCodes { get; private set; }

    public IReadOnlyList<ModuleEntitlement>? ModuleEntitlements { get; private set; }

    public int OverrideVersion { get; private set; }

    public DateTimeOffset ReportedAtUtc { get; private set; }

    public DateTimeOffset? OverrideUpdatedAtUtc { get; private set; }

    public Guid? OverrideUpdatedByOperatorId { get; private set; }

    public static Result<LicenseGrantTenant> Create(
        Guid id,
        Guid grantId,
        Guid tenantId,
        string tenantName,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty || grantId == Guid.Empty || tenantId == Guid.Empty)
        {
            return Result.Failure<LicenseGrantTenant>(
                new Error("license.tenant.ids", "Los identificadores de la empresa no son válidos.", ErrorType.Validation));
        }

        var nameError = ValidateName(tenantName);
        if (nameError is not null)
        {
            return Result.Failure<LicenseGrantTenant>(nameError);
        }

        return new LicenseGrantTenant
        {
            Id = id,
            GrantId = grantId,
            TenantId = tenantId,
            TenantName = tenantName.Trim(),
            ReportedAtUtc = utcNow,
        };
    }

    public Result<Unit> Report(string tenantName, DateTimeOffset utcNow)
    {
        var nameError = ValidateName(tenantName);
        if (nameError is not null)
        {
            return Result.Failure<Unit>(nameError);
        }

        TenantName = tenantName.Trim();
        ReportedAtUtc = utcNow;
        return Unit.Value;
    }

    public Result<Unit> SetOverride(
        IReadOnlyList<string> enabledModuleCodes,
        IReadOnlyList<ModuleEntitlement>? moduleEntitlements,
        Guid operatorId,
        DateTimeOffset utcNow)
    {
        if (operatorId == Guid.Empty)
        {
            return Result.Failure<Unit>(
                new Error("license.tenant.operator", "El operador es obligatorio.", ErrorType.Validation));
        }

        var modulesResult = LicensingPlan.NormalizeModules(enabledModuleCodes);
        if (modulesResult.IsFailure)
        {
            return Result.Failure<Unit>(modulesResult.Error!);
        }

        var modules = modulesResult.Value!;
        if (!modules.Contains(TenantModuleCodes.Identity, StringComparer.Ordinal))
        {
            return Result.Failure<Unit>(
                new Error("license.tenant.identity_required", "El módulo identity es obligatorio.", ErrorType.Validation));
        }

        var dependencyErrors = ModuleDependencyGraph.Validate(modules);
        if (dependencyErrors.Count > 0)
        {
            return Result.Failure<Unit>(
                new Error("license.tenant.dependencies", string.Join(' ', dependencyErrors), ErrorType.Validation));
        }

        if (moduleEntitlements is not null)
        {
            var tierErrors = ModuleDependencyGraph.ValidateTierConsistency(moduleEntitlements);
            if (tierErrors.Count > 0)
            {
                return Result.Failure<Unit>(
                    new Error("license.tenant.tier", string.Join(' ', tierErrors), ErrorType.Validation));
            }
        }

        var aligned = moduleEntitlements?
            .Where(e => modules.Contains(e.ModuleCode, StringComparer.OrdinalIgnoreCase))
            .ToList();

        EnabledModuleCodes = modules;
        ModuleEntitlements = aligned is { Count: > 0 } ? aligned : null;
        HasOverride = true;
        OverrideVersion++;
        OverrideUpdatedAtUtc = utcNow;
        OverrideUpdatedByOperatorId = operatorId;
        return Unit.Value;
    }

    public Result<Unit> ClearOverride(Guid operatorId, DateTimeOffset utcNow)
    {
        if (operatorId == Guid.Empty)
        {
            return Result.Failure<Unit>(
                new Error("license.tenant.operator", "El operador es obligatorio.", ErrorType.Validation));
        }

        HasOverride = false;
        ModuleEntitlements = null;
        EnabledModuleCodes = [];
        OverrideVersion++;
        OverrideUpdatedAtUtc = utcNow;
        OverrideUpdatedByOperatorId = operatorId;
        return Unit.Value;
    }

    private static Error? ValidateName(string tenantName)
    {
        if (string.IsNullOrWhiteSpace(tenantName) || tenantName.Trim().Length > TenantNameMaxLength)
        {
            return new Error(
                "license.tenant.name",
                $"El nombre de la empresa es obligatorio y no puede superar {TenantNameMaxLength} caracteres.",
                ErrorType.Validation);
        }

        return null;
    }
}
