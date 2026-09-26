namespace EcuNexo.Platform.Api.Configuration;

public sealed class LicenseValidationOptions
{
    public const string SectionName = "LicenseValidation";

    public string ValidationPepper { get; init; } = string.Empty;

    /// <summary>Clave máquina-a-máquina que el tenant envía en X-Platform-Validation-Key.</summary>
    public string? TenantApiKey { get; init; }
}
