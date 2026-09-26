using EcuNexo.Platform.Core.Licensing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcuNexo.Platform.Data.Licensing.Configurations;

public sealed class LicenseGrantEntitlementChangeConfiguration
    : IEntityTypeConfiguration<LicenseGrantEntitlementChange>
{
    public void Configure(EntityTypeBuilder<LicenseGrantEntitlementChange> builder)
    {
        builder.ToTable("license_grant_entitlement_changes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedNever();
        builder.Property(x => x.GrantId).HasColumnType("uuid").IsRequired();

        builder.HasOne<LicenseGrant>()
            .WithMany()
            .HasForeignKey(x => x.GrantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.PreviousEnabledModuleCodes).HasColumnType("jsonb").IsRequired();
        builder.Property(x => x.NewEnabledModuleCodes).HasColumnType("jsonb").IsRequired();
        builder.Property(x => x.PreviousEntitlements).HasColumnType("jsonb");
        builder.Property(x => x.NewEntitlements).HasColumnType("jsonb");
        builder.Property(x => x.Reason).HasMaxLength(LicenseGrantEntitlementChange.ReasonMaxLength);
        builder.Property(x => x.ChangedByOperatorId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.ChangedAtUtc).HasColumnType("timestamptz").IsRequired();

        builder.HasIndex(x => new { x.GrantId, x.ChangedAtUtc });
    }
}
