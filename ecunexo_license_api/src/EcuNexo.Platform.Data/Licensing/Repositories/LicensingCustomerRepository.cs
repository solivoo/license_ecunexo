using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Core.Licensing;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Data.Licensing.Repositories;

public sealed class LicensingCustomerRepository : ILicensingCustomerRepository
{
    private readonly LicensingDbContext _db;

    public LicensingCustomerRepository(LicensingDbContext db) => _db = db;

    public Task<LicensingCustomer?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<LicensingCustomer?> GetByIdTrackingAsync(Guid id, CancellationToken ct) =>
        _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task AddAsync(LicensingCustomer customer, CancellationToken ct)
    {
        _db.Customers.Add(customer);
        return Task.CompletedTask;
    }

    public void Remove(LicensingCustomer customer) => _db.Customers.Remove(customer);

    public Task<bool> ExistsByTaxIdAsync(string taxId, CancellationToken ct) =>
        _db.Customers.AsNoTracking().AnyAsync(c => c.TaxId == taxId, ct);

    public Task<bool> ExistsByTaxIdExceptAsync(string taxId, Guid exceptId, CancellationToken ct) =>
        _db.Customers.AsNoTracking().AnyAsync(c => c.TaxId == taxId && c.Id != exceptId, ct);

    public Task<bool> HasGrantsAsync(Guid customerId, CancellationToken ct) =>
        _db.LicenseGrants.AsNoTracking().AnyAsync(g => g.CustomerId == customerId, ct);

    public async Task<IReadOnlyList<LicensingCustomerListRow>> ListWithLicenseStatsAsync(CancellationToken ct)
    {
        return await _db.Customers.AsNoTracking()
            .OrderBy(c => c.LegalName)
            .Select(c => new LicensingCustomerListRow(
                c.Id,
                c.LegalName,
                c.TradeName,
                c.TaxId,
                c.ContactEmail,
                c.Status,
                _db.LicenseGrants.Count(g => g.CustomerId == c.Id),
                _db.LicenseGrants.Count(g =>
                    g.CustomerId == c.Id
                    && (g.Status == LicenseGrantStatus.Active || g.Status == LicenseGrantStatus.Exhausted)),
                _db.LicenseGrants
                    .Where(g => g.CustomerId == c.Id)
                    .Max(g => (DateTimeOffset?)g.IssuedAtUtc),
                c.DeploymentMode))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }
}
