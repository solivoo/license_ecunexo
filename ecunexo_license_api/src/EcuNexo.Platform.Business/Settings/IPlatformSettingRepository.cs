using EcuNexo.Platform.Core.Settings;

namespace EcuNexo.Platform.Business.Settings;

public interface IPlatformSettingRepository
{
    Task<PlatformSetting?> GetByKeyAsync(string key, CancellationToken ct = default);

    Task<string?> GetValueAsync(string key, CancellationToken ct = default);

    Task SaveAsync(PlatformSetting setting, CancellationToken ct = default);
}
