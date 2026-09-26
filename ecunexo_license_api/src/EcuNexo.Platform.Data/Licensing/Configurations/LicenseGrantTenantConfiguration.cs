using EcuNexo.Platform.Core.Licensing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcuNexo.Platform.Data.Licensing.Configurations;

public sealed class LicenseGrantTenantConfiguration : IEntityTypeConfiguration<LicenseGrantTenant>
{
    public void Configure(EntityTypeBuilder<LicenseGrantTenant> builder)
    {
        builder.ToTable("license_grant_tenants");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedNever();
        builder.Property(x => x.GrantId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.TenantId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.TenantName).HasMaxLength(LicenseGrantTenant.TenantNameMaxLength).IsRequired();
        builder.Property(x => x.HasOverride).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.EnabledModuleCodes).HasColumnType("jsonb").IsRequired();
        builder.Property(x => x.ModuleEntitlements).HasColumnType("jsonb");
        builder.Property(x => x.OverrideVersion).IsRequired().HasDefaultValue(0);
        builder.Property(x => x.ReportedAtUtc).HasColumnType("timestamptz").IsRequired();
        builder.Property(x => x.OverrideUpdatedAtUtc).HasColumnType("timestamptz");
        builder.Property(x => x.OverrideUpdatedByOperatorId).HasColumnType("uuid");

        builder.HasIndex(x => new { x.GrantId, x.TenantId }).IsUnique();
        builder.HasIndex(x => x.GrantId);

        builder.HasOne<LicenseGrant>()
            .WithMany()
            .HasForeignKey(x => x.GrantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
