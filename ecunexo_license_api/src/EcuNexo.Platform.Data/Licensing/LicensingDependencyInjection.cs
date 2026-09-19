using EcuNexo.Core.Abstractions;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Business.Settings;
using EcuNexo.Platform.Business.Training;
using EcuNexo.Platform.Data;
using EcuNexo.Platform.Data.Licensing.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EcuNexo.Platform.Data.Licensing;

public static class LicensingDependencyInjection
{
    public static IServiceCollection AddLicensingData(this IServiceCollection services, string licensingConnectionString)
    {
        services.AddDbContext<LicensingDbContext>(opts =>
            opts.UseNpgsql(licensingConnectionString, npg =>
                    npg.ConfigureDataSource(ds => ds.EnableDynamicJson())
                       .MigrationsHistoryTable("__ef_migrations_history", "licensing"))
                .UseSnakeCaseNamingConvention());

        services.AddScoped<IIdGenerator, UuidV7Generator>();
        services.AddScoped<ILicensingCustomerRepository, LicensingCustomerRepository>();
        services.AddScoped<ILicensingPlanRepository, LicensingPlanRepository>();
        services.AddScoped<IPlatformOperatorRepository, PlatformOperatorRepository>();
        services.AddScoped<ILicenseGrantRepository, LicenseGrantRepository>();
        services.AddScoped<ILicensingUnitOfWork, LicensingUnitOfWork>();
        services.AddScoped<ITrainingSessionRepository, TrainingSessionRepository>();
        services.AddScoped<IPlatformSettingRepository, PlatformSettingRepository>();
        services.AddSingleton<IProvisioningPayloadProtector, ProvisioningPayloadProtector>();

        return services;
    }
}
