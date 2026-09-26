using EcuNexo.Platform.Core.Licensing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcuNexo.Platform.Data.Licensing.Configurations;

public sealed class LicenseGrantConfiguration : IEntityTypeConfiguration<LicenseGrant>
{
    public void Configure(EntityTypeBuilder<LicenseGrant> builder)
    {
        builder.ToTable("license_grants");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedNever();
        builder.Property(x => x.CustomerId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.PlanCode).HasMaxLength(LicenseGrant.PlanCodeMaxLength).IsRequired();
        builder.Property(x => x.PlanLabel).HasMaxLength(LicenseGrant.PlanLabelMaxLength).IsRequired();
        builder.Property(x => x.ActivationCodeId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.CodeHash).HasMaxLength(LicenseGrant.CodeHashMaxLength).IsRequired();
        builder.HasIndex(x => x.CodeHash).IsUnique();
        builder.Property(x => x.EnabledModuleCodes).HasColumnType("jsonb").IsRequired();

        builder.Property(x => x.ModuleEntitlements)
            .HasColumnName("module_entitlements")
            .HasColumnType("jsonb");

        builder.Property(x => x.ExpiresAtUtc).HasColumnType("timestamptz").IsRequired();
        builder.Property(x => x.ProvisioningPayloadEncrypted).HasColumnType("bytea").IsRequired();
        builder.Property(x => x.ProvisionedTenantId).HasColumnType("uuid");
        builder.Property(x => x.IssuedAtUtc).HasColumnType("timestamptz").IsRequired();
        builder.Property(x => x.IssuedByOperatorId).HasColumnType("uuid").IsRequired();
        builder.Property(x => x.DeploymentMode).HasColumnType("smallint").IsRequired();
        builder.Property(x => x.Status).HasColumnType("smallint").IsRequired();
        builder.Property(x => x.OwnerEmailNormalized).HasMaxLength(LicenseGrant.OwnerEmailMaxLength);
        builder.Property(x => x.SupersedesGrantId).HasColumnType("uuid");
        builder.Property(x => x.Generation).IsRequired().HasDefaultValue(1);
        builder.Property(x => x.EntitlementsVersion).IsRequired().HasDefaultValue(1);
        builder.Property(x => x.EntitlementsUpdatedAtUtc)
            .HasColumnName("entitlements_updated_at_utc")
            .HasColumnType("timestamptz");
        builder.Property(x => x.EntitlementsUpdatedByOperatorId)
            .HasColumnName("entitlements_updated_by_operator_id")
            .HasColumnType("uuid");
        builder.Property(x => x.ReissueKind).HasColumnType("smallint");
        builder.Property(x => x.PreviousPlanCode).HasMaxLength(LicenseGrant.PlanCodeMaxLength);
        builder.Property(x => x.PreviousPlanLabel).HasMaxLength(LicenseGrant.PlanLabelMaxLength);
        builder.Property(x => x.OnlineValidationIntervalDays).HasDefaultValue(30);
        builder.HasIndex(x => x.OwnerEmailNormalized)
            .IsUnique()
            .HasFilter("status IN (0, 2) AND owner_email_normalized IS NOT NULL");
        builder.Property(x => x.TrainingPeriodFromUtc)
            .HasColumnName("training_period_from_utc")
            .HasColumnType("timestamptz");
        builder.Property(x => x.TrainingPeriodToUtc)
            .HasColumnName("training_period_to_utc")
            .HasColumnType("timestamptz");
        builder.Property(x => x.SupportPeriodFromUtc)
            .HasColumnName("support_period_from_utc")
            .HasColumnType("timestamptz");
        builder.Property(x => x.SupportPeriodToUtc)
            .HasColumnName("support_period_to_utc")
            .HasColumnType("timestamptz");
        builder.Property(x => x.RevokedAtUtc).HasColumnType("timestamptz");
        builder.Property(x => x.RevokedByOperatorId).HasColumnType("uuid");

        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.ActivationCodeId).IsUnique();
        builder.HasIndex(x => x.IssuedAtUtc);

        builder.HasOne<LicensingCustomer>()
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<LicensingPlan>()
            .WithMany()
            .HasForeignKey(x => x.PlanCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<PlatformOperator>()
            .WithMany()
            .HasForeignKey(x => x.IssuedByOperatorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property<uint>("xmin").IsRowVersion().HasColumnName("xmin");
    }
}
