using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Core.Licensing;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Data.Licensing.Repositories;

public sealed class LicenseGrantRepository : ILicenseGrantRepository
{
    private readonly LicensingDbContext _db;

    public LicenseGrantRepository(LicensingDbContext db) => _db = db;

    public Task AddAsync(LicenseGrant grant, CancellationToken ct)
    {
        _db.LicenseGrants.Add(grant);
        return Task.CompletedTask;
    }

    public Task AddEntitlementChangeAsync(LicenseGrantEntitlementChange change, CancellationToken ct)
    {
        _db.LicenseGrantEntitlementChanges.Add(change);
        return Task.CompletedTask;
    }

    public Task<LicenseGrant?> GetActiveByCodeHashForUpdateAsync(
        string codeHash,
        DateTimeOffset utcNow,
        CancellationToken ct) =>
        _db.LicenseGrants
            .Where(g =>
                g.CodeHash == codeHash
                && g.Status == LicenseGrantStatus.Active
                && g.ProvisioningSlotsRemaining > 0
                && g.ExpiresAtUtc > utcNow)
            .FirstOrDefaultAsync(ct);

    public Task<LicenseGrant?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.LicenseGrants.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id, ct);

    public Task<LicenseGrant?> GetByIdForUpdateAsync(Guid id, CancellationToken ct) =>
        _db.LicenseGrants.FirstOrDefaultAsync(g => g.Id == id, ct);

    public Task<LicenseGrant?> FindLatestCurrentByCustomerAsync(Guid customerId, CancellationToken ct) =>
        _db.LicenseGrants.AsNoTracking()
            .Where(g =>
                g.CustomerId == customerId
                && (g.Status == LicenseGrantStatus.Active || g.Status == LicenseGrantStatus.Exhausted))
            .OrderByDescending(g => g.IssuedAtUtc)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<LicenseGrant>> ListCurrentForUpdateByCustomerAsync(
        Guid customerId,
        CancellationToken ct)
    {
        return await _db.LicenseGrants
            .Where(g =>
                g.CustomerId == customerId
                && (g.Status == LicenseGrantStatus.Active || g.Status == LicenseGrantStatus.Exhausted))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public Task<int> RevokeForReissueAsync(
        Guid grantId,
        DateTimeOffset revokedAtUtc,
        Guid revokedByOperatorId,
        CancellationToken ct) =>
        _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE licensing.license_grants
            SET status = 1,
                revoked_at_utc = {revokedAtUtc},
                revoked_by_operator_id = {revokedByOperatorId},
                provisioning_slots_remaining = 0,
                owner_email_normalized = NULL
            WHERE id = {grantId}
              AND status IN (0, 2)
            """,
            ct);

    public Task AssignOwnerEmailAsync(
        Guid grantId,
        string ownerEmailNormalized,
        CancellationToken ct)
    {
        var normalized = ownerEmailNormalized.Trim().ToLowerInvariant();
        return _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE licensing.license_grants
            SET owner_email_normalized = {normalized}
            WHERE id = {grantId}
            """,
            ct);
    }

    public Task ReinstateAsync(
        Guid grantId,
        LicenseGrantStatus status,
        int provisioningSlotsRemaining,
        string ownerEmailNormalized,
        CancellationToken ct)
    {
        var normalized = ownerEmailNormalized.Trim().ToLowerInvariant();
        var statusValue = (short)status;
        // El correo solo vuelve si nadie más lo tiene vigente: restaurar la licencia importa
        // más que su titular, y este rollback no puede fallar.
        return _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE licensing.license_grants g
            SET status = {statusValue},
                revoked_at_utc = NULL,
                revoked_by_operator_id = NULL,
                provisioning_slots_remaining = {provisioningSlotsRemaining},
                owner_email_normalized = CASE
                    WHEN EXISTS (
                        SELECT 1 FROM licensing.license_grants x
                        WHERE x.owner_email_normalized = {normalized}
                          AND x.status IN (0, 2)
                          AND x.id <> {grantId})
                    THEN NULL
                    ELSE {normalized}
                END
            WHERE g.id = {grantId}
            """,
            ct);
    }

    public Task DeleteAsync(Guid grantId, CancellationToken ct) =>
        _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM licensing.license_grants WHERE id = {grantId}",
            ct);

    public Task<bool> ExistsActiveOwnerEmailAsync(string ownerEmailNormalized, CancellationToken ct)
    {
        var normalized = ownerEmailNormalized.Trim().ToLowerInvariant();
        return _db.LicenseGrants.AsNoTracking().AnyAsync(
            g =>
                g.OwnerEmailNormalized == normalized
                && (g.Status == LicenseGrantStatus.Active || g.Status == LicenseGrantStatus.Exhausted),
            ct);
    }

    public Task<bool> ExistsActiveOwnerEmailExceptAsync(
        string ownerEmailNormalized,
        Guid excludedGrantId,
        CancellationToken ct)
    {
        var normalized = ownerEmailNormalized.Trim().ToLowerInvariant();
        return _db.LicenseGrants.AsNoTracking().AnyAsync(
            g =>
                g.Id != excludedGrantId
                && g.OwnerEmailNormalized == normalized
                && (g.Status == LicenseGrantStatus.Active || g.Status == LicenseGrantStatus.Exhausted),
            ct);
    }

    public async Task<IReadOnlyList<LicenseGrantListRow>> ListAsync(CancellationToken ct)
    {
        return await (
            from grant in _db.LicenseGrants.AsNoTracking()
            join customer in _db.Customers.AsNoTracking() on grant.CustomerId equals customer.Id
            join op in _db.Operators.AsNoTracking() on grant.IssuedByOperatorId equals op.Id
            orderby grant.IssuedAtUtc descending
            select new LicenseGrantListRow(
                grant.Id,
                grant.CustomerId,
                customer.LegalName,
                customer.TradeName,
                grant.OwnerEmailNormalized,
                grant.PlanCode,
                grant.PlanLabel,
                grant.Status,
                grant.IssuedAtUtc,
                grant.ExpiresAtUtc,
                grant.ProvisioningSlotsRemaining,
                grant.MaxTenants,
                op.Name,
                grant.SupersedesGrantId,
                grant.OnlineValidationIntervalDays,
                grant.Generation,
                grant.ReissueKind,
                grant.PreviousPlanCode,
                grant.PreviousPlanLabel))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }
}
