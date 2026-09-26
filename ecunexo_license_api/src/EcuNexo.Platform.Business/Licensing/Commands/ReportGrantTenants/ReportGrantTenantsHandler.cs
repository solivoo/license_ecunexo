using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.ReportGrantTenants;

public sealed class ReportGrantTenantsHandler
    : ICommandHandler<ReportGrantTenantsCommand, ReportGrantTenantsResponse>
{
    private readonly IValidator<ReportGrantTenantsCommand> _validator;
    private readonly ILicenseGrantRepository _grants;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public ReportGrantTenantsHandler(
        IValidator<ReportGrantTenantsCommand> validator,
        ILicenseGrantRepository grants,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _grants = grants;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ReportGrantTenantsResponse>> Handle(
        ReportGrantTenantsCommand command,
        CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<ReportGrantTenantsResponse>(
                new Error("license.tenants.report.validation", message, ErrorType.Validation));
        }

        var grant = await _grants.GetByIdAsync(command.GrantId, ct).ConfigureAwait(false);
        if (grant is null)
        {
            return Result.Failure<ReportGrantTenantsResponse>(
                new Error("license.tenants.not_found", "Licencia no encontrada.", ErrorType.NotFound));
        }

        var utcNow = DateTimeOffset.UtcNow;
        var known = new Dictionary<Guid, LicenseGrantTenant>();

        foreach (var reported in command.Tenants)
        {
            if (known.TryGetValue(reported.TenantId, out var knownTenant))
            {
                var reportedResult = knownTenant.Report(reported.Name, utcNow);
                if (reportedResult.IsFailure)
                {
                    return Result.Failure<ReportGrantTenantsResponse>(reportedResult.Error!);
                }

                continue;
            }

            var tenant = await _grants
                .GetTenantForUpdateAsync(command.GrantId, reported.TenantId, ct)
                .ConfigureAwait(false);

            if (tenant is not null)
            {
                var reportedResult = tenant.Report(reported.Name, utcNow);
                if (reportedResult.IsFailure)
                {
                    return Result.Failure<ReportGrantTenantsResponse>(reportedResult.Error!);
                }

                known[tenant.TenantId] = tenant;
                continue;
            }

            var created = LicenseGrantTenant.Create(
                _idGenerator.NewId(),
                command.GrantId,
                reported.TenantId,
                reported.Name,
                utcNow);
            if (created.IsFailure)
            {
                return Result.Failure<ReportGrantTenantsResponse>(created.Error!);
            }

            var newTenant = created.Value!;
            await _grants.AddTenantAsync(newTenant, ct).ConfigureAwait(false);
            known[newTenant.TenantId] = newTenant;
        }

        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new ReportGrantTenantsResponse(grant.Id, command.Tenants.Count));
    }
}
