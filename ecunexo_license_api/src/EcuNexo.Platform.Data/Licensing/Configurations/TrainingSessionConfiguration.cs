using EcuNexo.Platform.Core.Training;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcuNexo.Platform.Data.Licensing.Configurations;

public sealed class TrainingSessionConfiguration : IEntityTypeConfiguration<TrainingSession>
{
    public void Configure(EntityTypeBuilder<TrainingSession> builder)
    {
        builder.ToTable("training_sessions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.CustomerId).HasMaxLength(64).IsRequired();
        builder.Property(x => x.LicenseGrantId).IsRequired();

        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.LicenseGrantId);

        builder.Property(x => x.Topic).HasMaxLength(TrainingSession.TopicMaxLength).IsRequired();
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.Modality).HasConversion<string>().HasMaxLength(10).IsRequired();
        builder.Property(x => x.DurationHours).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(x => x.ScheduledAt).HasColumnType("timestamptz").IsRequired();
        builder.Property(x => x.CompletedAt).HasColumnType("timestamptz");
        builder.Property(x => x.Notes).HasMaxLength(TrainingSession.NotesMaxLength);
        builder.Property(x => x.AttendeeEmails)
            .HasColumnName("attendee_emails")
            .HasColumnType("jsonb")
            .IsRequired();
        builder.Property(x => x.CreatedByOperatorId).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("timestamptz").IsRequired();
        builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");
    }
}
