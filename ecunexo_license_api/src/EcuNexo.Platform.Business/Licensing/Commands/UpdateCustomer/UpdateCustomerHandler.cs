using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.UpdateCustomer;

public sealed class UpdateCustomerHandler : ICommandHandler<UpdateCustomerCommand, CustomerDetailResponse>
{
    private readonly IValidator<UpdateCustomerCommand> _validator;
    private readonly ILicensingCustomerRepository _customers;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public UpdateCustomerHandler(
        IValidator<UpdateCustomerCommand> validator,
        ILicensingCustomerRepository customers,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _customers = customers;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CustomerDetailResponse>> Handle(UpdateCustomerCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<CustomerDetailResponse>(
                new Error("customer.update.validation", message, ErrorType.Validation));
        }

        var customer = await _customers.GetByIdTrackingAsync(command.CustomerId, ct).ConfigureAwait(false);
        if (customer is null)
        {
            return Result.Failure<CustomerDetailResponse>(
                new Error("customer.update.not_found", "Cliente no encontrado.", ErrorType.NotFound));
        }

        var taxId = string.IsNullOrWhiteSpace(command.TaxId) ? null : command.TaxId.Trim();
        if (taxId is not null)
        {
            var exists = await _customers.ExistsByTaxIdExceptAsync(taxId, command.CustomerId, ct)
                .ConfigureAwait(false);
            if (exists)
            {
                return Result.Failure<CustomerDetailResponse>(
                    new Error(
                        "customer.tax_id.duplicate",
                        "Ya existe un cliente con ese RUC/identificación fiscal.",
                        ErrorType.Conflict));
            }
        }

        var updated = customer.Update(
            command.LegalName,
            command.DeploymentMode,
            command.CountryCode,
            command.TradeName,
            taxId,
            command.ContactName,
            command.ContactEmail,
            command.ContactPhone,
            command.Notes,
            command.RequestedByOperatorId);

        if (updated.IsFailure)
        {
            return Result.Failure<CustomerDetailResponse>(updated.Error!);
        }

        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success(GetCustomerHandler.Map(customer));
    }
}
