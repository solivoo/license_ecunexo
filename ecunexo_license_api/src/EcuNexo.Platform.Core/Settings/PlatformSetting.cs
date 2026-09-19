namespace EcuNexo.Platform.Core.Settings;

public sealed class PlatformSetting
{
    public const int KeyMaxLength = 128;
    public const int DescriptionMaxLength = 256;

    private PlatformSetting()
    {
        Key = string.Empty;
        Value = string.Empty;
    }

    public PlatformSetting(string key, string value, string? description = null)
    {
        Key = key.Trim();
        Value = value;
        Description = description?.Trim();
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public string Key { get; private set; }

    public string Value { get; private set; }

    public string? Description { get; private set; }

    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public void UpdateValue(string newValue, string? newDescription = null)
    {
        Value = newValue;
        if (newDescription != null)
        {
            Description = newDescription.Trim();
        }
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}
