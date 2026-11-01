using EcuNexo.Core.Abstractions;
using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;
using FluentValidation;

namespace EcuNexo.Platform.Business.Licensing.Commands.CreateCustomer;

public sealed class CreateCustomerHandler : ICommandHandler<CreateCustomerCommand, CreateCustomerResponse>
{
    private readonly IValidator<CreateCustomerCommand> _validator;
    private readonly ILicensingCustomerRepository _customers;
    private readonly IIdGenerator _idGenerator;
    private readonly ILicensingUnitOfWork _unitOfWork;

    public CreateCustomerHandler(
        IValidator<CreateCustomerCommand> validator,
        ILicensingCustomerRepository customers,
        IIdGenerator idGenerator,
        ILicensingUnitOfWork unitOfWork)
    {
        _validator = validator;
        _customers = customers;
        _idGenerator = idGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CreateCustomerResponse>> Handle(CreateCustomerCommand command, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(command, ct).ConfigureAwait(false);
        if (!validation.IsValid)
        {
            var message = string.Join(' ', validation.Errors.Select(e => e.ErrorMessage));
            return Result.Failure<CreateCustomerResponse>(
                new Error("customer.create.validation", message, ErrorType.Validation));
        }

        var taxId = string.IsNullOrWhiteSpace(command.TaxId) ? null : command.TaxId.Trim();
        if (taxId is not null)
        {
            var exists = await _customers.ExistsByTaxIdAsync(taxId, ct).ConfigureAwait(false);
            if (exists)
            {
                return Result.Failure<CreateCustomerResponse>(
                    new Error(
                        "customer.tax_id.duplicate",
                        "Ya existe un cliente con ese RUC/identificación fiscal.",
                        ErrorType.Conflict));
            }
        }

        var created = LicensingCustomer.Create(
            _idGenerator.NewId(),
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

        if (!created.IsSuccess)
        {
            return Result.Failure<CreateCustomerResponse>(created.Error!);
        }

        var customer = created.Value!;
        await _customers.AddAsync(customer, ct).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(
            new CreateCustomerResponse(
                customer.Id,
                customer.LegalName,
                customer.TradeName,
                customer.TaxId,
                customer.ContactEmail,
                customer.CountryCode,
                customer.DeploymentMode.ToString(),
                customer.Status.ToString()));
    }
}
