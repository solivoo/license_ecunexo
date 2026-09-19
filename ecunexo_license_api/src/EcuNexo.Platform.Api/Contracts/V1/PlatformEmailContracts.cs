namespace EcuNexo.Platform.Api.Contracts.V1;

public sealed record PlatformEmailSettingsResponse(
    string Host,
    int Port,
    bool UseSsl,
    string UserName,
    bool HasPassword,
    string SenderEmail,
    string SenderName,
    bool IsConfigured,
    string Source);

public sealed record UpdatePlatformEmailSettingsRequest(
    string Host,
    int Port,
    bool UseSsl,
    string UserName,
    string? Password,
    string SenderEmail,
    string SenderName);

public sealed record TestPlatformEmailRequest(
    string TargetEmail,
    string? Subject = null);

public sealed record SendLicenseDeliveryEmailRequest(
    Guid GrantId,
    string? RecipientEmail = null,
    string? ActivationCodePlaintext = null,
    string? LicenseArtifact = null);

public sealed record SendTrainingInviteEmailRequest(
    Guid SessionId,
    IReadOnlyList<string>? RecipientEmails = null);

public sealed class PlatformEmailSmtpConfig
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseSsl { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
}
