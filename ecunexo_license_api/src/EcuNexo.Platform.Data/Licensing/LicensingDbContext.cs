using EcuNexo.Platform.Core.Licensing;
using EcuNexo.Platform.Core.Settings;
using EcuNexo.Platform.Core.Training;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Data.Licensing;

public sealed class LicensingDbContext : DbContext
{
    public LicensingDbContext(DbContextOptions<LicensingDbContext> options)
        : base(options)
    {
    }

    public DbSet<LicensingCustomer> Customers => Set<LicensingCustomer>();

    public DbSet<LicensingPlan> Plans => Set<LicensingPlan>();

    public DbSet<PlatformOperator> Operators => Set<PlatformOperator>();

    public DbSet<LicenseGrant> LicenseGrants => Set<LicenseGrant>();

    public DbSet<TrainingSession> TrainingSessions => Set<TrainingSession>();

    public DbSet<PlatformSetting> Settings => Set<PlatformSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("licensing");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LicensingDbContext).Assembly);
    }
}
