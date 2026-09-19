using EcuNexo.Platform.Business.Settings;
using EcuNexo.Platform.Core.Settings;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Data.Licensing.Repositories;

public sealed class PlatformSettingRepository : IPlatformSettingRepository
{
    private readonly LicensingDbContext _db;

    public PlatformSettingRepository(LicensingDbContext db)
    {
        _db = db;
    }

    public async Task<PlatformSetting?> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        var trimmed = key.Trim();
        return await _db.Settings
            .FirstOrDefaultAsync(s => s.Key == trimmed, ct)
            .ConfigureAwait(false);
    }

    public async Task<string?> GetValueAsync(string key, CancellationToken ct = default)
    {
        var setting = await GetByKeyAsync(key, ct).ConfigureAwait(false);
        return setting?.Value;
    }

    public async Task SaveAsync(PlatformSetting setting, CancellationToken ct = default)
    {
        var existing = await _db.Settings
            .FirstOrDefaultAsync(s => s.Key == setting.Key, ct)
            .ConfigureAwait(false);

        if (existing == null)
        {
            await _db.Settings.AddAsync(setting, ct).ConfigureAwait(false);
        }
        else
        {
            existing.UpdateValue(setting.Value, setting.Description);
        }

        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
