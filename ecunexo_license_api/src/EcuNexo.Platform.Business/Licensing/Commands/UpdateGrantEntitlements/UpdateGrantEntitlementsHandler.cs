using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Licensing.Queries.GetGrantEntitlements;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateGrantEntitlements;

public sealed class UpdateGrantEntitlementsHandler
    : ICommandHandler<UpdateGrantEntitlementsCommand, GrantEntitlementsResponse>
{
    private readonly IValidator<UpdateGrantEntitlementsCommand> _validator;
    private readonly ILicenseGrantRepository _grants;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public UpdateGrantEntitlementsHandler(
        IValidator<UpdateGrantEntitlementsCommand> validator,
        ILicenseGrantRepository grants,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _grants = grants;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<GrantEntitlementsResponse>> Handle(
        UpdateGrantEntitlementsCommand command,
        CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<GrantEntitlementsResponse>(
                new Error("license.entitlements.update.validation", message, ErrorType.Validation));
        }

        var grant = await _grants.GetByIdForUpdateAsync(command.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<GrantEntitlementsResponse>(
                new Error("license.entitlements.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        var previousModules = grant.EnabledModuleCodes.ToList();
        var previousEntitlements = grant.ModuleEntitlements;

        var utcNow = DateTimeOffset.UtcNow;
        var updated = grant.UpdateEntitlements(
            command.EnabledModuleCodes,
            command.ModuleEntitlements,
            command.IssuedByOperatorId,
            utcNow);
        if (updated.IsFailure)
        {
            return Result.Failure<GrantEntitlementsResponse>(updated.Error!);
        }

        var change = LicenseGrantEntitlementChange.Create(
            _idGenerator.NewId(),
            grant.Id,
            previousModules,
            grant.EnabledModuleCodes,
            previousEntitlements,
            grant.ModuleEntitlements,
            command.IssuedByOperatorId,
            utcNow,
            command.Reason);
        if (change.IsFailure)
        {
            return Result.Failure<GrantEntitlementsResponse>(change.Error!);
        }

        await _grants.AddEntitlementChangeAsync(change.Value!, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

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
