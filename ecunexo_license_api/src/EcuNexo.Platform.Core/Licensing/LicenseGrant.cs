using EcuNexo.Core.Common;
using EcuNexo.Core.Tenancy;

namespace EcuNexo.Platform.Core.Licensing;

public sealed class LicenseGrant : AggregateRoot<Guid>
{
    public const int PlanCodeMaxLength = 64;
    public const int CodeHashMaxLength = 128;
    public const int PlanLabelMaxLength = 120;
    public const int OwnerEmailMaxLength = 320;

    private LicenseGrant()
    {
        PlanCode = string.Empty;
        CodeHash = string.Empty;
        PlanLabel = string.Empty;
        EnabledModuleCodes = [];
        ProvisioningPayloadEncrypted = [];
    }

    public Guid CustomerId { get; private set; }

    public string PlanCode { get; private set; }

    public string PlanLabel { get; private set; }

    public Guid ActivationCodeId { get; private set; }

    public string CodeHash { get; private set; }

    public int MaxTenants { get; private set; }

    public int MaxUsers { get; private set; }

    public int MaxWarehouses { get; private set; }

    public List<string> EnabledModuleCodes { get; private set; }

    /// <summary>
    /// Derechos de uso por módulo con tiers y límites transaccionales.
    /// Reemplaza a <see cref="EnabledModuleCodes"/> para toda validación nueva.
    /// </summary>
    public IReadOnlyList<ModuleEntitlement>? ModuleEntitlements { get; private set; }

    public DateTimeOffset ExpiresAtUtc { get; private set; }

    public int ProvisioningSlotsRemaining { get; private set; }

    public byte[] ProvisioningPayloadEncrypted { get; private set; }

    public Guid? ProvisionedTenantId { get; private set; }

    public DateTimeOffset IssuedAtUtc { get; private set; }

    public Guid IssuedByOperatorId { get; private set; }

    public LicensingDeploymentMode DeploymentMode { get; private set; }

    public int? ValidityDays { get; private set; }

    public string? Notes { get; private set; }

    public LicenseGrantStatus Status { get; private set; }

    public string? OwnerEmailNormalized { get; private set; }

    public Guid? SupersedesGrantId { get; private set; }

    /// <summary>1 = emisión original; cada renovación o ampliación suma 1.</summary>
    public int Generation { get; private set; } = 1;

    /// <summary>Versión de entitlements editables en caliente (cloud). 1 = emisión; +1 por cambio.</summary>
    public int EntitlementsVersion { get; private set; } = 1;

    public DateTimeOffset? EntitlementsUpdatedAtUtc { get; private set; }

    public Guid? EntitlementsUpdatedByOperatorId { get; private set; }

    /// <summary>
    /// Actualiza módulos y entitlements de una licencia cloud activa sin reemitir el artefacto.
    /// Los tenants sincronizan el cambio en su próxima validación online.
    /// </summary>
    public Result<Unit> UpdateEntitlements(
        IReadOnlyList<string> enabledModuleCodes,
        IReadOnlyList<ModuleEntitlement>? moduleEntitlements,
        Guid operatorId,
        DateTimeOffset utcNow)
    {
        if (Status != LicenseGrantStatus.Active)
        {
            return Result.Failure<Unit>(
                new Error(
                    "license.entitlements.status",
                    "Solo una licencia activa admite cambios de módulos.",
                    ErrorType.Conflict));
        }

        if (DeploymentMode != LicensingDeploymentMode.CloudShared)
        {
            return Result.Failure<Unit>(
                new Error(
                    "license.entitlements.offline_mode",
                    "En despliegues on-premise los módulos se aplican reemitiendo la licencia.",
                    ErrorType.Validation));
        }

        if (operatorId == Guid.Empty)
        {
            return Result.Failure<Unit>(
                new Error("license.entitlements.operator", "El operador es obligatorio.", ErrorType.Validation));
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
                new Error("license.entitlements.identity_required", "El módulo identity es obligatorio.", ErrorType.Validation));
        }

        var dependencyErrors = ModuleDependencyGraph.Validate(modules);
        if (dependencyErrors.Count > 0)
        {
            return Result.Failure<Unit>(
                new Error("license.entitlements.dependencies", string.Join(' ', dependencyErrors), ErrorType.Validation));
        }

        if (moduleEntitlements is not null)
        {
            var tierErrors = ModuleDependencyGraph.ValidateTierConsistency(moduleEntitlements);
            if (tierErrors.Count > 0)
            {
                return Result.Failure<Unit>(
                    new Error("license.entitlements.tier", string.Join(' ', tierErrors), ErrorType.Validation));
            }
        }

        var aligned = moduleEntitlements?
            .Where(e => modules.Contains(e.ModuleCode, StringComparer.OrdinalIgnoreCase))
            .ToList();

        EnabledModuleCodes = modules;
        ModuleEntitlements = aligned is { Count: > 0 } ? aligned : null;
        EntitlementsVersion++;
        EntitlementsUpdatedAtUtc = utcNow;
        EntitlementsUpdatedByOperatorId = operatorId;
        return Unit.Value;
    }

    public void TouchEntitlements(Guid operatorId, DateTimeOffset utcNow)
    {
        EntitlementsVersion++;
        EntitlementsUpdatedAtUtc = utcNow;
        EntitlementsUpdatedByOperatorId = operatorId;
    }

    /// <summary>Null en la emisión original. Renew = mismo plan; Expand = cambio de plan.</summary>
    public LicenseReissueKind? ReissueKind { get; private set; }

    public string? PreviousPlanCode { get; private set; }

    public string? PreviousPlanLabel { get; private set; }

    public int OnlineValidationIntervalDays { get; private set; } = 30;

    /// <summary>Período personalizado de capacitación (inicio). null = desde IssuedAtUtc.</summary>
    public DateTimeOffset? TrainingPeriodFromUtc { get; private set; }

    /// <summary>Período personalizado de capacitación (fin). null = hasta ExpiresAtUtc.</summary>
    public DateTimeOffset? TrainingPeriodToUtc { get; private set; }

    /// <summary>Período personalizado de soporte (inicio). null = desde IssuedAtUtc.</summary>
    public DateTimeOffset? SupportPeriodFromUtc { get; private set; }

    /// <summary>Período personalizado de soporte (fin). null = hasta ExpiresAtUtc.</summary>
    public DateTimeOffset? SupportPeriodToUtc { get; private set; }

    public DateTimeOffset? RevokedAtUtc { get; private set; }

    public Guid? RevokedByOperatorId { get; private set; }

    public static Result<LicenseGrant> Create(
        Guid id,
        Guid customerId,
        string planCode,
        string planLabel,
        Guid activationCodeId,
        string codeHash,
        int maxTenants,
        int maxUsers,
        int maxWarehouses,
        IReadOnlyList<string> enabledModuleCodes,
        IReadOnlyList<ModuleEntitlement>? moduleEntitlements,
        DateTimeOffset expiresAtUtc,
        byte[] provisioningPayloadEncrypted,
        Guid issuedByOperatorId,
        LicensingDeploymentMode deploymentMode,
        DateTimeOffset issuedAtUtc,
        string ownerEmailNormalized,
        int onlineValidationIntervalDays,
        int? validityDays = null,
        string? notes = null,
        Guid? supersedesGrantId = null,
        DateTimeOffset? trainingPeriodFromUtc = null,
        DateTimeOffset? trainingPeriodToUtc = null,
        DateTimeOffset? supportPeriodFromUtc = null,
        DateTimeOffset? supportPeriodToUtc = null,
        int generation = 1,
        LicenseReissueKind? reissueKind = null,
        string? previousPlanCode = null,
        string? previousPlanLabel = null)
    {
        if (id == Guid.Empty || customerId == Guid.Empty || activationCodeId == Guid.Empty)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.ids.invalid", "Los identificadores no son válidos.", ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(planCode) || planCode.Length > PlanCodeMaxLength)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.plan_code.invalid", "El código de plan no es válido.", ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(planLabel) || planLabel.Length > PlanLabelMaxLength)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.plan_label.invalid", "La etiqueta del plan no es válida.", ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(codeHash) || codeHash.Length > CodeHashMaxLength)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.code_hash.invalid", "La huella del código no es válida.", ErrorType.Validation));
        }

        if (provisioningPayloadEncrypted.Length == 0)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.payload.required", "El payload de aprovisionamiento es obligatorio.", ErrorType.Validation));
        }

        if (issuedByOperatorId == Guid.Empty)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.operator.invalid", "El operador emisor es obligatorio.", ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(ownerEmailNormalized) || ownerEmailNormalized.Length > OwnerEmailMaxLength)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.owner_email.invalid", "El correo del titular no es válido.", ErrorType.Validation));
        }

        if (maxTenants < 1)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.max_tenants.invalid", "Debe permitirse al menos una empresa.", ErrorType.Validation));
        }

        if (maxUsers < 0 || maxWarehouses < 0)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.limits.invalid", "Los límites no pueden ser negativos.", ErrorType.Validation));
        }

        var modules = LicensingPlan.NormalizeModules(enabledModuleCodes);
        if (modules.IsFailure)
        {
            return Result.Failure<LicenseGrant>(modules.Error!);
        }

        if (expiresAtUtc <= issuedAtUtc)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.expires.invalid", "La fecha de expiración debe ser futura.", ErrorType.Validation));
        }

        if (onlineValidationIntervalDays is < 1 or > 90)
        {
            return Result.Failure<LicenseGrant>(
                new Error(
                    "grant.validation_interval.invalid",
                    "El intervalo de validación debe estar entre 1 y 90 días.",
                    ErrorType.Validation));
        }

        var periodError = ValidatePeriod(trainingPeriodFromUtc, trainingPeriodToUtc, issuedAtUtc, expiresAtUtc, "capacitación");
        if (periodError is not null) return Result.Failure<LicenseGrant>(periodError);

        periodError = ValidatePeriod(supportPeriodFromUtc, supportPeriodToUtc, issuedAtUtc, expiresAtUtc, "soporte");
        if (periodError is not null) return Result.Failure<LicenseGrant>(periodError);

        if (generation < 1)
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.generation.invalid", "La generación de la licencia debe ser al menos 1.", ErrorType.Validation));
        }

        var previousCode = string.IsNullOrWhiteSpace(previousPlanCode) ? null : previousPlanCode.Trim().ToLowerInvariant();
        var previousLabel = string.IsNullOrWhiteSpace(previousPlanLabel) ? null : previousPlanLabel.Trim();
        if (previousCode is { Length: > PlanCodeMaxLength } || previousLabel is { Length: > PlanLabelMaxLength })
        {
            return Result.Failure<LicenseGrant>(
                new Error("grant.previous_plan.invalid", "El plan anterior no es válido.", ErrorType.Validation));
        }

        return new LicenseGrant
        {
            Id = id,
            CustomerId = customerId,
            PlanCode = planCode.Trim().ToLowerInvariant(),
            PlanLabel = planLabel.Trim(),
            ActivationCodeId = activationCodeId,
            CodeHash = codeHash.Trim(),
            MaxTenants = maxTenants,
            MaxUsers = maxUsers,
            MaxWarehouses = maxWarehouses,
            EnabledModuleCodes = modules.Value!,
            ModuleEntitlements = moduleEntitlements,
            ExpiresAtUtc = expiresAtUtc,
            ProvisioningSlotsRemaining = maxTenants,
            ProvisioningPayloadEncrypted = provisioningPayloadEncrypted,
            IssuedAtUtc = issuedAtUtc,
            IssuedByOperatorId = issuedByOperatorId,
            DeploymentMode = deploymentMode,
            ValidityDays = validityDays,
            Notes = notes?.Trim(),
            OwnerEmailNormalized = ownerEmailNormalized.Trim().ToLowerInvariant(),
            SupersedesGrantId = supersedesGrantId,
            Generation = generation,
            ReissueKind = reissueKind,
            PreviousPlanCode = previousCode,
            PreviousPlanLabel = previousLabel,
            OnlineValidationIntervalDays = onlineValidationIntervalDays,
            TrainingPeriodFromUtc = trainingPeriodFromUtc,
            TrainingPeriodToUtc = trainingPeriodToUtc,
            SupportPeriodFromUtc = supportPeriodFromUtc,
            SupportPeriodToUtc = supportPeriodToUtc,
            Status = LicenseGrantStatus.Active,
        };
    }

    private static Error? ValidatePeriod(
        DateTimeOffset? from,
        DateTimeOffset? to,
        DateTimeOffset issuedAtUtc,
        DateTimeOffset expiresAtUtc,
        string label)
    {
        if (from is null && to is null) return null;

        var effectiveFrom = from ?? issuedAtUtc;
        var effectiveTo = to ?? expiresAtUtc;

        if (effectiveFrom >= effectiveTo)
        {
            return new Error(
                "grant.period.invalid",
                $"El período de {label} no es válido: la fecha de inicio debe ser anterior a la de fin.",
                ErrorType.Validation);
        }

        if (effectiveFrom < issuedAtUtc)
        {
            return new Error(
                "grant.period.out_of_bounds",
                $"El período de {label} empieza antes de la emisión de la licencia ({issuedAtUtc:yyyy-MM-dd}).",
                ErrorType.Validation);
        }

        if (effectiveTo > expiresAtUtc)
        {
            return new Error(
                "grant.period.out_of_bounds",
                $"El período de {label} termina después de la expiración de la licencia ({expiresAtUtc:yyyy-MM-dd}).",
                ErrorType.Validation);
        }

        return null;
    }

    public DateTimeOffset EffectiveTrainingFrom() => TrainingPeriodFromUtc ?? IssuedAtUtc;
    public DateTimeOffset EffectiveTrainingTo() => TrainingPeriodToUtc ?? ExpiresAtUtc;

    public DateTimeOffset EffectiveSupportFrom() => SupportPeriodFromUtc ?? IssuedAtUtc;
    public DateTimeOffset EffectiveSupportTo() => SupportPeriodToUtc ?? ExpiresAtUtc;

    public bool IsRevokedOrExpired(DateTimeOffset utcNow) =>
        Status == LicenseGrantStatus.Revoked || utcNow >= ExpiresAtUtc;

    public bool IsActiveForProvisioning(DateTimeOffset utcNow) =>
        Status == LicenseGrantStatus.Active
        && ProvisioningSlotsRemaining > 0
        && utcNow < ExpiresAtUtc;

    public Result<Unit> RecordProvisioning(Guid tenantId, DateTimeOffset utcNow)
    {
        if (tenantId == Guid.Empty)
        {
            return Result.Failure<Unit>(
                new Error("grant.tenant_id.invalid", "El tenant es obligatorio.", ErrorType.Validation));
        }

        if (!IsActiveForProvisioning(utcNow))
        {
            return Result.Failure<Unit>(
                new Error("grant.inactive", "La licencia no está activa o ha expirado.", ErrorType.Conflict));
        }

        ProvisioningSlotsRemaining--;
        ProvisionedTenantId = tenantId;
        if (ProvisioningSlotsRemaining == 0)
        {
            Status = LicenseGrantStatus.Exhausted;
        }

        return Unit.Value;
    }

    public Result<Unit> Revoke(Guid operatorId, DateTimeOffset utcNow)
    {
        if (Status != LicenseGrantStatus.Active && Status != LicenseGrantStatus.Exhausted)
        {
            return Result.Failure<Unit>(
                new Error(
                    "grant.revoke.invalid",
                    "Solo se pueden revocar licencias vigentes o con cupo agotado.",
                    ErrorType.Conflict));
        }

        Status = LicenseGrantStatus.Revoked;
        RevokedAtUtc = utcNow;
        RevokedByOperatorId = operatorId;
        ProvisioningSlotsRemaining = 0;
        return Unit.Value;
    }

    /// <summary>
    /// El INSERT inicial de una reemisión va sin correo para no chocar con el índice único
    /// del grant que aún está activo. Luego se asigna el correo con SQL.
    /// </summary>
    public void OmitOwnerEmailForInsert()
    {
        OwnerEmailNormalized = null;
    }
}
