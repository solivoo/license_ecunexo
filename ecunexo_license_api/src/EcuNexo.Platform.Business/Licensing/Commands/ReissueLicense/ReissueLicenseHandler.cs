using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Tenancy;
using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Core.Licensing;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Core.Licensing;
using PlatformActivationCodeGenerator = EcuNexo.Platform.Core.Tenancy.ActivationCodeGenerator;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.ReissueLicense;

/// <summary>
/// Revoca la licencia anterior y emite una nueva ligada por <see cref="LicenseGrant.SupersedesGrantId"/>.
/// Cupos y módulos salen del plan vigente en BD (no del grant congelado), para poder ampliar.
/// </summary>
public sealed class ReissueLicenseHandler : ICommandHandler<ReissueLicenseCommand, ReissueLicenseResponse>
{
    private readonly IValidator<ReissueLicenseCommand> _validator;
    private readonly ILicenseGrantRepository _grants;
    private readonly ILicensingPlanRepository _plans;
    private readonly IProvisioningPayloadProtector _protector;
    private readonly IActivationCodePepperProvider _issuePepper;
    private readonly ILicenseValidationPepperProvider _validationPepper;
    private readonly ILicenseArtifactIssuer _artifactIssuer;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public ReissueLicenseHandler(
        IValidator<ReissueLicenseCommand> validator,
        ILicenseGrantRepository grants,
        ILicensingPlanRepository plans,
        IProvisioningPayloadProtector protector,
        IActivationCodePepperProvider issuePepper,
        ILicenseValidationPepperProvider validationPepper,
        ILicenseArtifactIssuer artifactIssuer,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _grants = grants;
        _plans = plans;
        _protector = protector;
        _issuePepper = issuePepper;
        _validationPepper = validationPepper;
        _artifactIssuer = artifactIssuer;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ReissueLicenseResponse>> Handle(ReissueLicenseCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.validation", message, ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(_issuePepper.Pepper) || string.IsNullOrWhiteSpace(_validationPepper.ValidationPepper))
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.peppers.missing", "Peppers de licencia no configurados.", ErrorType.Unexpected));
        }

        // Sin tracking a propósito: la licencia anterior se actualiza con SQL en su propio commit,
        // así EF no la arrastra al mismo INSERT de la nueva.
        var previous = await _grants.GetByIdAsync(command.GrantId, ct).ConfigureAwait(false);
        if (previous is null)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        if (previous.Status == LicenseGrantStatus.Revoked)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.revoked", "La licencia ya está revocada.", ErrorType.Conflict));
        }

        var planCode = string.IsNullOrWhiteSpace(command.PlanCode)
            ? previous.PlanCode
            : command.PlanCode.Trim().ToLowerInvariant();
        var plan = await _plans.GetByCodeAnyStatusAsync(planCode, ct).ConfigureAwait(false);
        if (plan is null)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error(
                    "license.reissue.plan_not_found",
                    $"No existe el plan «{planCode}» en el catálogo. Actualízalo en Planes y módulos.",
                    ErrorType.NotFound));
        }

        var samePlan = string.Equals(previous.PlanCode, plan.Code, StringComparison.OrdinalIgnoreCase);
        var modules = command.EnabledModuleCodesOverride is { Count: > 0 }
            ? command.EnabledModuleCodesOverride.ToList()
            : (samePlan && previous.EnabledModuleCodes.Count > 0 ? previous.EnabledModuleCodes.ToList() : plan.EnabledModuleCodesDefault.ToList());

        if (!modules.Contains("identity", StringComparer.OrdinalIgnoreCase))
        {
            modules.Add("identity");
        }

        var depErrors = ModuleDependencyGraph.Validate(modules);
        if (depErrors.Count > 0)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.module_deps", string.Join(' ', depErrors), ErrorType.Validation));
        }

        var hasWarehousing = modules.Contains(TenantModuleCodes.Warehousing, StringComparer.OrdinalIgnoreCase);
        var maxUsers = command.MaxUsersOverride ?? (samePlan ? previous.MaxUsers : plan.MaxUsersDefault);
        var maxWarehouses = hasWarehousing
            ? (command.MaxWarehousesOverride ?? (samePlan ? previous.MaxWarehouses : plan.MaxWarehousesDefault))
            : 0;
        var maxTenants = command.MaxTenantsOverride ?? (samePlan ? previous.MaxTenants : plan.MaxTenantsDefault);

        var rawEntitlements = command.ModuleEntitlementsOverride
            ?? (samePlan && previous.ModuleEntitlements is not null ? previous.ModuleEntitlements : ResolveEntitlements(plan));

        var entitlements = AlignCupoLimits(
            rawEntitlements,
            modules,
            maxUsers,
            maxWarehouses);
        if (entitlements is not null && entitlements.Count > 0)
        {
            var tierErrors = ModuleDependencyGraph.ValidateTierConsistency(entitlements);
            if (tierErrors.Count > 0)
            {
                return Result.Failure<ReissueLicenseResponse>(
                    new Error("license.reissue.tier_consistency", string.Join(' ', tierErrors), ErrorType.Validation));
            }
        }

        LicenseProvisioningPayload provisioning;
        try
        {
            provisioning = _protector.Decrypt(previous.ProvisioningPayloadEncrypted);
        }
        catch (Exception)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.payload", "No se pudo leer el titular de la licencia.", ErrorType.Unexpected));
        }

        // El titular indexado de la licencia anterior manda sobre el del payload: es el que ve el
        // operador y el que sostiene el índice único. Si difieren, el payload se realinea.
        var ownerEmail = string.IsNullOrWhiteSpace(previous.OwnerEmailNormalized)
            ? provisioning.OwnerEmail.Trim().ToLowerInvariant()
            : previous.OwnerEmailNormalized.Trim().ToLowerInvariant();
        if (!string.Equals(provisioning.OwnerEmail, ownerEmail, StringComparison.OrdinalIgnoreCase))
        {
            provisioning = provisioning with { OwnerEmail = ownerEmail };
        }

        var ownerTaken = await _grants
            .ExistsActiveOwnerEmailExceptAsync(ownerEmail, previous.Id, ct)
            .ConfigureAwait(false);
        if (ownerTaken)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error(
                    "license.reissue.owner_email_duplicate",
                    $"Otra licencia vigente ya usa el titular «{ownerEmail}». Revócala antes de reemitir esta.",
                    ErrorType.Conflict));
        }

        var utcNow = DateTimeOffset.UtcNow;
        var previousStatus = previous.Status;
        var previousSlots = previous.ProvisioningSlotsRemaining;
        var revoke = previous.Revoke(command.IssuedByOperatorId, utcNow);
        if (revoke.IsFailure)
        {
            return Result.Failure<ReissueLicenseResponse>(revoke.Error!);
        }

        var validityDays = command.ValidityDays ?? previous.ValidityDays ?? 365;
        var validationIntervalDays = command.OnlineValidationIntervalDays ?? previous.OnlineValidationIntervalDays;
        validationIntervalDays = LicenseValidationPolicy.NormalizeIntervalDays(validationIntervalDays);
        var expiresAt = utcNow.AddDays(validityDays);

        var plaintextCode = PlatformActivationCodeGenerator.Generate();
        var normalized = LicenseHashing.NormalizeActivationCode(plaintextCode);
        string issueHash;
        string validationHash;
        try
        {
            issueHash = LicenseHashing.ComputeIssueHash(normalized, _issuePepper.Pepper);
            validationHash = LicenseHashing.ComputeValidationHash(normalized, _validationPepper.ValidationPepper);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.hash.failed", ex.Message, ErrorType.Validation));
        }

        byte[] encrypted;
        try
        {
            encrypted = _protector.Encrypt(provisioning);
        }
        catch (Exception)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.payload.encrypt_failed", "No se pudo cifrar el payload.", ErrorType.Unexpected));
        }

        var newGrantId = _idGenerator.NewId();
        var reissueKind = samePlan ? LicenseReissueKind.Renew : LicenseReissueKind.Expand;
        var grantCreated = LicenseGrant.Create(
            newGrantId,
            previous.CustomerId,
            plan.Code,
            plan.DisplayName,
            _idGenerator.NewId(),
            issueHash,
            maxTenants,
            maxUsers,
            maxWarehouses,
            modules,
            entitlements,
            expiresAt,
            encrypted,
            command.IssuedByOperatorId,
            previous.DeploymentMode,
            utcNow,
            ownerEmail,
            validationIntervalDays,
            validityDays,
            previous.Notes,
            previous.Id,
            previous.TrainingPeriodFromUtc,
            previous.TrainingPeriodToUtc,
            previous.SupportPeriodFromUtc,
            previous.SupportPeriodToUtc,
            previous.Generation + 1,
            reissueKind,
            previous.PlanCode,
            previous.PlanLabel);

        if (grantCreated.IsFailure)
        {
            return Result.Failure<ReissueLicenseResponse>(grantCreated.Error!);
        }

        var newGrant = grantCreated.Value;
        if (newGrant is null)
        {
            return Result.Failure<ReissueLicenseResponse>(
                new Error("license.reissue.create_failed", "No se pudo crear la nueva licencia.", ErrorType.Unexpected));
        }

        var artifactPayload = new LicenseArtifactPayload(
            newGrantId,
            validationHash,
            expiresAt,
            plan.DisplayName,
            maxTenants,
            maxUsers,
            maxWarehouses,
            modules,
            entitlements,
            MapProvisioning(provisioning),
            previous.Id,
            validationIntervalDays);

        var signed = _artifactIssuer.Sign(artifactPayload);
        if (signed.IsFailure)
        {
            return Result.Failure<ReissueLicenseResponse>(signed.Error!);
        }

        // El índice único parcial (titular + estado vigente) solo libera su entrada cuando la
        // revocación está confirmada: dentro de una misma transacción sigue viendo la fila vieja.
        // De ahí los tres commits, en este orden para no dejar nunca al cliente sin licencia:
        //   1) alta de la nueva sin titular  2) revocación de la anterior  3) traspaso del titular.
        newGrant.OmitOwnerEmailForInsert();
        await _grants.AddAsync(newGrant, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        var revoked = await _grants
            .RevokeForReissueAsync(previous.Id, utcNow, command.IssuedByOperatorId, ct)
            .ConfigureAwait(false);
        if (revoked != 1)
        {
            await _grants.DeleteAsync(newGrant.Id, ct).ConfigureAwait(false);
            return Result.Failure<ReissueLicenseResponse>(
                new Error(
                    "license.reissue.revoke_failed",
                    "Otro proceso cambió la licencia anterior. Recarga el historial e inténtalo de nuevo.",
                    ErrorType.Conflict));
        }

        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(
                async innerCt =>
                {
                    await _grants.AssignOwnerEmailAsync(newGrant.Id, ownerEmail, innerCt).ConfigureAwait(false);
                    await _grants.AssignOwnerEmailAsync(previous.Id, ownerEmail, innerCt).ConfigureAwait(false);
                },
                ct).ConfigureAwait(false);
        }
        catch (Exception)
        {
            await _grants.DeleteAsync(newGrant.Id, ct).ConfigureAwait(false);
            await _grants
                .ReinstateAsync(previous.Id, previousStatus, previousSlots, ownerEmail, ct)
                .ConfigureAwait(false);
            return Result.Failure<ReissueLicenseResponse>(
                new Error(
                    "license.reissue.owner_conflict",
                    "El titular ya tiene otra licencia vigente. Se restauró la licencia anterior.",
                    ErrorType.Conflict));
        }

        return Result.Success(new ReissueLicenseResponse(
            newGrantId,
            previous.Id,
            plaintextCode,
            signed.Value!,
            expiresAt,
            maxTenants,
            plan.DisplayName,
            validationIntervalDays,
            newGrant.Generation,
            reissueKind.ToString(),
            previous.PlanLabel,
            maxUsers,
            maxWarehouses,
            maxTenants,
            modules));
    }

    private static IReadOnlyList<ModuleEntitlement>? ResolveEntitlements(LicensingPlan plan)
    {
        if (plan.ModuleEntitlementsDefault is { Count: > 0 })
        {
            return plan.ModuleEntitlementsDefault;
        }

        return ModuleTierCatalog.FromModuleCodesWithTier(plan.EnabledModuleCodesDefault);
    }

    private static IReadOnlyList<ModuleEntitlement>? AlignCupoLimits(
        IReadOnlyList<ModuleEntitlement>? entitlements,
        IReadOnlyList<string> modules,
        int maxUsers,
        int maxWarehouses)
    {
        var baseList = entitlements is { Count: > 0 }
            ? entitlements
                .Where(e => modules.Contains(e.ModuleCode, StringComparer.OrdinalIgnoreCase))
                .ToList()
            : [];

        var missingModules = modules
            .Where(m => !baseList.Any(e => string.Equals(e.ModuleCode, m, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        if (missingModules.Count > 0)
        {
            baseList.AddRange(ModuleTierCatalog.FromModuleCodesWithTier(missingModules));
        }

        if (baseList.Count == 0)
        {
            return entitlements;
        }

        var aligned = new List<ModuleEntitlement>(baseList.Count);
        foreach (var entitlement in baseList)
        {
            if (string.Equals(entitlement.ModuleCode, TenantModuleCodes.Warehousing, StringComparison.OrdinalIgnoreCase))
            {
                aligned.Add(WithLimit(entitlement, ModuleTierCatalog.LimitMaxWarehouses, maxWarehouses));
                continue;
            }

            if (string.Equals(entitlement.ModuleCode, TenantModuleCodes.Identity, StringComparison.OrdinalIgnoreCase))
            {
                aligned.Add(WithLimit(entitlement, ModuleTierCatalog.LimitMaxUsers, maxUsers));
                continue;
            }

            aligned.Add(entitlement);
        }

        return aligned;
    }

    private static ModuleEntitlement WithLimit(ModuleEntitlement entitlement, string limitKey, int value)
    {
        var limits = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        if (entitlement.Limits is not null)
        {
            foreach (var pair in entitlement.Limits)
            {
                limits[pair.Key] = pair.Value;
            }
        }

        limits[limitKey] = value;
        return ModuleEntitlement.FromTierWithOverrides(entitlement.ModuleCode, entitlement.Tier, limits);
    }

    private static LicenseArtifactProvisioning MapProvisioning(LicenseProvisioningPayload p) =>
        new(
            p.OwnerEmail,
            p.OwnerName,
            p.OwnerPassword,
            p.OwnerDepartment,
            p.OwnerPhone,
            p.OwnerJobTitle);
}
