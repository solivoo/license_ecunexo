using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Tenancy;
using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Core.Licensing;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Core.Licensing;
using PlatformActivationCodeGenerator = EcuNexo.Platform.Core.Tenancy.ActivationCodeGenerator;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace EcuNexo.Platform.Business.Licensing.Commands.IssueLicense;

/// <summary>Emite licencia solo en <c>licensing_ecunexo</c> y entrega paquete firmado al cliente.</summary>
public sealed class IssueLicenseHandler : ICommandHandler<IssueLicenseCommand, IssueLicenseResponse>
{
    private readonly IValidator<IssueLicenseCommand> _validator;
    private readonly ILicensingCustomerRepository _customers;
    private readonly ILicensingPlanRepository _plans;
    private readonly ILicenseGrantRepository _grants;
    private readonly IProvisioningPayloadProtector _protector;
    private readonly IActivationCodePepperProvider _issuePepper;
    private readonly ILicenseValidationPepperProvider _validationPepper;
    private readonly ILicenseArtifactIssuer _artifactIssuer;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;
    private readonly ILogger<IssueLicenseHandler> _logger;

    public IssueLicenseHandler(
        IValidator<IssueLicenseCommand> validator,
        ILicensingCustomerRepository customers,
        ILicensingPlanRepository plans,
        ILicenseGrantRepository grants,
        IProvisioningPayloadProtector protector,
        IActivationCodePepperProvider issuePepper,
        ILicenseValidationPepperProvider validationPepper,
        ILicenseArtifactIssuer artifactIssuer,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork,
        ILogger<IssueLicenseHandler> logger)
    {
        _validator = validator;
        _customers = customers;
        _plans = plans;
        _grants = grants;
        _protector = protector;
        _issuePepper = issuePepper;
        _validationPepper = validationPepper;
        _artifactIssuer = artifactIssuer;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<IssueLicenseResponse>> Handle(IssueLicenseCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
#pragma warning disable CA1848
            _logger.LogWarning("IssueLicense validation failed: {ValidationErrors}", message);
#pragma warning restore CA1848
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.issue.validation", message, ErrorType.Validation));
        }

        if (string.IsNullOrWhiteSpace(_issuePepper.Pepper))
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.issue_pepper.missing", "Pepper de emisión no configurado.", ErrorType.Unexpected));
        }

        if (string.IsNullOrWhiteSpace(_validationPepper.ValidationPepper))
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.validation_pepper.missing", "Pepper de validación no configurado.", ErrorType.Unexpected));
        }

        var customer = await _customers.GetByIdAsync(command.CustomerId, ct).ConfigureAwait(false);
        if (customer is null || customer.Status != LicensingCustomerStatus.Active)
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.customer.not_found", "Cliente no encontrado o inactivo.", ErrorType.NotFound));
        }

        if (!command.AllowAdditionalLicense)
        {
            var existing = await _grants.FindLatestCurrentByCustomerAsync(command.CustomerId, ct)
                .ConfigureAwait(false);
            if (existing is not null)
            {
                return Result.Failure<IssueLicenseResponse>(
                    new Error(
                        "license.customer.has_active",
                        "El cliente ya tiene una licencia vigente. Renueva esa licencia o confirma que deseas crear una adicional.",
                        ErrorType.Conflict));
            }
        }

        var plan = await _plans.GetByCodeAsync(command.PlanCode, ct).ConfigureAwait(false);
        if (plan is null)
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.plan.not_found", "Plan no encontrado.", ErrorType.NotFound));
        }

        var ownerEmailNormalized = command.Provisioning.OwnerEmail.Trim().ToLowerInvariant();
        if (await _grants.ExistsActiveOwnerEmailAsync(ownerEmailNormalized, ct).ConfigureAwait(false))
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error(
                    "license.owner.email_duplicate",
                    "Ya existe una licencia activa para ese correo de titular.",
                    ErrorType.Conflict));
        }

        var modules = command.EnabledModuleCodesOverride ?? plan.EnabledModuleCodesDefault;
        var hasWarehousing = modules.Contains(TenantModuleCodes.Warehousing, StringComparer.OrdinalIgnoreCase);
        var maxTenants = command.MaxTenantsOverride ?? plan.MaxTenantsDefault;
        var maxUsers = command.MaxUsersOverride ?? plan.MaxUsersDefault;
        var maxWarehouses = hasWarehousing
            ? (command.MaxWarehousesOverride ?? plan.MaxWarehousesDefault)
            : 0;

        // Resolver ModuleEntitlements: sobrescritos del operador > defaults del plan > catálogo de tiers
        var entitlements = AlignCupoLimits(
            ResolveEntitlements(command.ModuleEntitlementsOverride, plan.ModuleEntitlementsDefault, modules),
            maxUsers,
            maxWarehouses);

        // Validar consistencia de tiers en el conjunto final de entitlements
        if (entitlements is not null && entitlements.Count > 0)
        {
            var tierErrors = ModuleDependencyGraph.ValidateTierConsistency(entitlements);
            if (tierErrors.Count > 0)
            {
                return Result.Failure<IssueLicenseResponse>(
                    new Error("license.tier_consistency", string.Join(" ", tierErrors), ErrorType.Validation));
            }
        }

        var validityDays = command.ValidityDays ?? 365;
        var validationIntervalDays = LicenseValidationPolicy.NormalizeIntervalDays(command.OnlineValidationIntervalDays);
        var utcNow = DateTimeOffset.UtcNow;
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
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.hash.failed", ex.Message, ErrorType.Validation));
        }

        byte[] encrypted;
        try
        {
            encrypted = _protector.Encrypt(command.Provisioning);
        }
        catch (Exception)
        {
            return Result.Failure<IssueLicenseResponse>(
                new Error("license.payload.encrypt_failed", "No se pudo cifrar el payload.", ErrorType.Unexpected));
        }

        var effectiveDeploymentMode = command.DeploymentMode != LicensingDeploymentMode.CloudShared
            ? command.DeploymentMode
            : customer.DeploymentMode;

        var grantId = _idGenerator.NewId();
        var activationCodeId = _idGenerator.NewId();
        var grantCreated = LicenseGrant.Create(
            grantId,
            command.CustomerId,
            plan.Code,
            plan.DisplayName,
            activationCodeId,
            issueHash,
            maxTenants,
            maxUsers,
            maxWarehouses,
            modules,
            entitlements,
            expiresAt,
            encrypted,
            command.IssuedByOperatorId,
            effectiveDeploymentMode,
            utcNow,
            ownerEmailNormalized,
            validationIntervalDays,
            validityDays,
            command.Notes,
            null,
            command.TrainingPeriodFromUtc,
            command.TrainingPeriodToUtc,
            command.SupportPeriodFromUtc,
            command.SupportPeriodToUtc);

        if (grantCreated.IsFailure)
        {
            return Result.Failure<IssueLicenseResponse>(grantCreated.Error!);
        }

        var artifactPayload = new LicenseArtifactPayload(
            grantId,
            validationHash,
            expiresAt,
            plan.DisplayName,
            maxTenants,
            maxUsers,
            maxWarehouses,
            modules,
            entitlements,
            MapProvisioning(command.Provisioning),
            null,
            validationIntervalDays);

        var signed = _artifactIssuer.Sign(artifactPayload);
        if (signed.IsFailure)
        {
            return Result.Failure<IssueLicenseResponse>(signed.Error!);
        }

        await _grants.AddAsync(grantCreated.Value!, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new IssueLicenseResponse(
            grantId,
            plaintextCode,
            signed.Value!,
            expiresAt,
            maxTenants,
            plan.DisplayName,
            effectiveDeploymentMode.ToString()));
    }

    /// <summary>
    /// Resuelve la lista de <see cref="ModuleEntitlement"/> final:
    /// 1. Si el operador sobrescribió explícitamente → usa eso.
    /// 2. Si el plan tiene defaults de tiers → usa eso.
    /// 3. Si solo hay códigos legacy → genera entitlements con tier Small desde el catálogo de tiers.
    /// </summary>
    private static IReadOnlyList<ModuleEntitlement>? ResolveEntitlements(
        IReadOnlyList<ModuleEntitlement>? overrides,
        IReadOnlyList<ModuleEntitlement>? planDefaults,
        IReadOnlyList<string> moduleCodes)
    {
        if (overrides is not null && overrides.Count > 0)
        {
            return overrides;
        }

        if (planDefaults is not null && planDefaults.Count > 0)
        {
            return planDefaults;
        }

        // Fallback para planes legacy sin entitlements definidos:
        // generar tiers Small para módulos operativos, Big para catalog (completo por defecto)
        return ModuleTierCatalog.FromModuleCodesWithTier(moduleCodes);
    }

    /// <summary>
    /// El cupo comercial (usuarios / bodegas) manda sobre el default del tier Small.
    /// </summary>
    private static IReadOnlyList<ModuleEntitlement>? AlignCupoLimits(
        IReadOnlyList<ModuleEntitlement>? entitlements,
        int maxUsers,
        int maxWarehouses)
    {
        if (entitlements is null || entitlements.Count == 0)
        {
            return entitlements;
        }

        var aligned = new List<ModuleEntitlement>(entitlements.Count);
        foreach (var entitlement in entitlements)
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
