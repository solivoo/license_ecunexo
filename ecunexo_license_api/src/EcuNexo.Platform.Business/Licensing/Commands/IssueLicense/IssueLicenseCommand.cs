using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Core.Licensing;

namespace EcuNexo.Platform.Business.Licensing.Commands.IssueLicense;

public sealed record IssueLicenseCommand(
    Guid CustomerId,
    string PlanCode,
    LicensingDeploymentMode DeploymentMode,
    Guid IssuedByOperatorId,
    LicenseProvisioningPayload Provisioning,
    int? ValidityDays = null,
    int? MaxTenantsOverride = null,
    int? MaxUsersOverride = null,
    int? MaxWarehousesOverride = null,
    IReadOnlyList<string>? EnabledModuleCodesOverride = null,
    IReadOnlyList<ModuleEntitlement>? ModuleEntitlementsOverride = null,
    int? OnlineValidationIntervalDays = null,
    string? Notes = null,
    DateTimeOffset? TrainingPeriodFromUtc = null,
    DateTimeOffset? TrainingPeriodToUtc = null,
    DateTimeOffset? SupportPeriodFromUtc = null,
    DateTimeOffset? SupportPeriodToUtc = null,
    bool AllowAdditionalLicense = false) : ICommand<IssueLicenseResponse>;

public sealed record IssueLicenseResponse(
    Guid LicenseId,
    string ActivationCodePlaintext,
    string LicenseArtifact,
    DateTimeOffset ExpiresAtUtc,
    int ProvisioningSlotsRemaining,
    string PlanLabel,
    string DeploymentMode = "CloudShared");
