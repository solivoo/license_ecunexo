using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Commands.DeactivateCustomer;

public sealed record DeactivateCustomerCommand(Guid CustomerId, Guid RequestedByOperatorId)
    : ICommand<DeactivateCustomerResponse>;

public sealed record DeactivateCustomerResponse(Guid Id, string Status, bool Removed);

public sealed class DeactivateCustomerHandler
    : ICommandHandler<DeactivateCustomerCommand, DeactivateCustomerResponse>
{
    private readonly ILicensingCustomerRepository _customers;
    private readonly ILicenseGrantRepository _grants;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public DeactivateCustomerHandler(
        ILicensingCustomerRepository customers,
        ILicenseGrantRepository grants,
        ILicensingUnitOfWork unitOfWork)
    {
        _customers = customers;
        _grants = grants;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DeactivateCustomerResponse>> Handle(
        DeactivateCustomerCommand command,
        CancellationToken ct)
    {
        var customer = await _customers.GetByIdTrackingAsync(command.CustomerId, ct).ConfigureAwait(false);
        if (customer is null)
        {
            return Result.Failure<DeactivateCustomerResponse>(
                new Error("customer.deactivate.not_found", "Cliente no encontrado.", ErrorType.NotFound));
        }

        var hasGrants = await _customers.HasGrantsAsync(command.CustomerId, ct).ConfigureAwait(false);
        if (!hasGrants)
        {
            _customers.Remove(customer);
            await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success(new DeactivateCustomerResponse(command.CustomerId, "Deleted", true));
        }

        var current = await _grants.ListCurrentForUpdateByCustomerAsync(command.CustomerId, ct)
            .ConfigureAwait(false);
        var utcNow = DateTimeOffset.UtcNow;
        foreach (var grant in current)
        {
            var revoked = grant.Revoke(command.RequestedByOperatorId, utcNow);
            if (revoked.IsFailure)
            {
                return Result.Failure<DeactivateCustomerResponse>(revoked.Error!);
            }
        }

        var suspended = customer.Suspend(command.RequestedByOperatorId);
        if (suspended.IsFailure)
        {
            return Result.Failure<DeactivateCustomerResponse>(suspended.Error!);
        }

        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success(
            new DeactivateCustomerResponse(customer.Id, customer.Status.ToString(), false));
    }
}
