using EcuNexo.Platform.Core.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcuNexo.Platform.Data.Licensing.Configurations;

public sealed class PlatformSettingConfiguration : IEntityTypeConfiguration<PlatformSetting>
{
    public void Configure(EntityTypeBuilder<PlatformSetting> builder)
    {
        builder.ToTable("platform_settings");
        builder.HasKey(x => x.Key);

        builder.Property(x => x.Key)
            .HasMaxLength(PlatformSetting.KeyMaxLength)
            .IsRequired();

        builder.Property(x => x.Value)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.Description)
            .HasMaxLength(PlatformSetting.DescriptionMaxLength);

        builder.Property(x => x.UpdatedAtUtc)
            .IsRequired();
    }
}
