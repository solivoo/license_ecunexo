using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Business.Abstractions;

namespace EcuNexo.Platform.Business.Licensing.Queries.ListLicenses;

public sealed record ListLicensesQuery : IQuery<ListLicensesResponse>;

public sealed record ListLicensesResponse(IReadOnlyList<LicenseListItem> Items);

public sealed record LicenseListItem(
    Guid Id,
    Guid CustomerId,
    string CustomerLegalName,
    string? CustomerTradeName,
    string? OwnerEmail,
    string PlanCode,
    string PlanLabel,
    string Status,
    DateTimeOffset IssuedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    int ProvisioningSlotsRemaining,
    int MaxTenants,
    string IssuedByOperatorName,
    Guid? SupersedesGrantId,
    int OnlineValidationIntervalDays,
    int Generation,
    string? ReissueKind,
    string? PreviousPlanCode,
    string? PreviousPlanLabel,
    int MaxUsers = 0,
    int MaxWarehouses = 0,
    IReadOnlyList<string>? EnabledModuleCodes = null,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlements = null);
