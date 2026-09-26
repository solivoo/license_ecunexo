using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantTenantEntitlements;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantTenantEntitlements;

public sealed class UpdateGrantTenantEntitlementsHandler
    : ICommandHandler<UpdateGrantTenantEntitlementsCommand, GrantTenantEntitlementsResponse>
{
    private readonly IValidator<UpdateGrantTenantEntitlementsCommand> _validator;
    private readonly ILicenseGrantRepository _grants;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public UpdateGrantTenantEntitlementsHandler(
        IValidator<UpdateGrantTenantEntitlementsCommand> validator,
        ILicenseGrantRepository grants,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _grants = grants;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<GrantTenantEntitlementsResponse>> Handle(
        UpdateGrantTenantEntitlementsCommand command,
        CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error("license.tenant.entitlements.update.validation", message, ErrorType.Validation));
        }

        var grant = await _grants.GetByIdForUpdateAsync(command.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error("license.tenant.entitlements.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        if (grant.Status != LicenseGrantStatus.Active)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error(
                    "license.tenant.entitlements.status",
                    "Solo una licencia activa admite cambios de módulos.",
                    ErrorType.Conflict));
        }

        if (grant.DeploymentMode != LicensingDeploymentMode.CloudShared)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error(
                    "license.tenant.entitlements.offline_mode",
                    "En despliegues on-premise los módulos se aplican reemitiendo la licencia.",
                    ErrorType.Validation));
        }

        var tenant = await _grants
            .GetTenantForUpdateAsync(command.GrantId, command.TenantId, ct)
            .ConfigureAwait(false);
        if (tenant is null)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(
                new Error(
                    "license.tenant.entitlements.tenant_not_found",
                    "Empresa no encontrada para la licencia.",
                    ErrorType.NotFound));
        }

        var previousModules = tenant.HasOverride
            ? tenant.EnabledModuleCodes.ToList()
            : grant.EnabledModuleCodes.ToList();
        var previousEntitlements = tenant.HasOverride
            ? tenant.ModuleEntitlements
            : grant.ModuleEntitlements;

        var utcNow = DateTimeOffset.UtcNow;
        var updated = tenant.SetOverride(
            command.EnabledModuleCodes,
            command.ModuleEntitlements,
            command.OperatorId,
            utcNow);
        if (updated.IsFailure)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(updated.Error!);
        }

        var change = LicenseGrantEntitlementChange.Create(
            _idGenerator.NewId(),
            grant.Id,
            previousModules,
            tenant.EnabledModuleCodes,
            previousEntitlements,
            tenant.ModuleEntitlements,
            command.OperatorId,
            utcNow,
            command.Reason,
            tenant.TenantId,
            tenant.TenantName);
        if (change.IsFailure)
        {
            return Result.Failure<GrantTenantEntitlementsResponse>(change.Error!);
        }

        grant.TouchEntitlements(command.OperatorId, utcNow);

        await _grants.AddEntitlementChangeAsync(change.Value!, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(GrantTenantEntitlementsResponse.From(grant, tenant));
    }
}
