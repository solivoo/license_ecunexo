using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing;

public interface ILicensingCustomerRepository
{
    Task<LicensingCustomer?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<LicensingCustomer?> GetByIdTrackingAsync(Guid id, CancellationToken ct);

    Task AddAsync(LicensingCustomer customer, CancellationToken ct);

    void Remove(LicensingCustomer customer);

    Task<bool> ExistsByTaxIdAsync(string taxId, CancellationToken ct);

    Task<bool> ExistsByTaxIdExceptAsync(string taxId, Guid exceptId, CancellationToken ct);

    Task<bool> HasGrantsAsync(Guid customerId, CancellationToken ct);

    Task<IReadOnlyList<LicensingCustomerListRow>> ListWithLicenseStatsAsync(CancellationToken ct);
}

public sealed record LicensingCustomerListRow(
    Guid Id,
    string LegalName,
    string? TradeName,
    string? TaxId,
    string? ContactEmail,
    LicensingCustomerStatus Status,
    int LicensesIssued,
    int ActiveLicenses,
    DateTimeOffset? LastLicenseIssuedAtUtc,
    LicensingDeploymentMode DeploymentMode = LicensingDeploymentMode.CloudShared);
