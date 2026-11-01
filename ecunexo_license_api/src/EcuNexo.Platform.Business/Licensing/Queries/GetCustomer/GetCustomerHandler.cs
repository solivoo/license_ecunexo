using EcuNexo.Core.Common;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Queries.GetCustomer;

public sealed class GetCustomerHandler : IQueryHandler<GetCustomerQuery, CustomerDetailResponse?>
{
    private readonly ILicensingCustomerRepository _customers;

    public GetCustomerHandler(ILicensingCustomerRepository customers) => _customers = customers;

    public async Task<Result<CustomerDetailResponse?>> Handle(GetCustomerQuery query, CancellationToken ct)
    {
        var customer = await _customers.GetByIdAsync(query.CustomerId, ct).ConfigureAwait(false);
        if (customer is null)
        {
            return Result.Success<CustomerDetailResponse?>(null);
        }

        return Result.Success<CustomerDetailResponse?>(Map(customer));
    }

    internal static CustomerDetailResponse Map(LicensingCustomer customer) =>
        new(
            customer.Id,
            customer.LegalName,
            customer.TradeName,
            customer.TaxId,
            customer.CountryCode,
            customer.DeploymentMode.ToString(),
            customer.ContactName,
            customer.ContactEmail,
            customer.ContactPhone,
            customer.Notes,
            customer.Status.ToString());
}
