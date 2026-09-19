using Asp.Versioning;
using EcuNexo.Platform.Api.Configuration;
using EcuNexo.Platform.Api.Development;
using EcuNexo.Platform.Api.Email;
using EcuNexo.Platform.Api.Endpoints.V1;
using EcuNexo.Platform.Api.Licensing;
using EcuNexo.Platform.Api.Security;
using EcuNexo.Platform.Api.Tenancy;
using EcuNexo.Platform.Business;
using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Business.Licensing;
using EcuNexo.Platform.Business.Tenancy;
using EcuNexo.Platform.Data.Licensing;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var licensingConnection = builder.Configuration.GetConnectionString("Licensing")
    ?? throw new InvalidOperationException("ConnectionStrings:Licensing is not configured.");

builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });

builder.Services.AddOpenApi();

builder.Services.AddPlatformJwt(builder.Configuration);

builder.Services.Configure<ActivationCodeOptions>(
    builder.Configuration.GetSection(ActivationCodeOptions.SectionName));
builder.Services.Configure<LicenseValidationOptions>(
    builder.Configuration.GetSection(LicenseValidationOptions.SectionName));
builder.Services.Configure<LicenseSigningOptions>(
    builder.Configuration.GetSection(LicenseSigningOptions.SectionName));
builder.Services.Configure<LicensingOptions>(
    builder.Configuration.GetSection(LicensingOptions.SectionName));
builder.Services.AddScoped<IActivationCodePepperProvider, ActivationCodePepperProvider>();
builder.Services.AddScoped<ILicenseValidationPepperProvider, LicenseValidationPepperProvider>();
builder.Services.AddScoped<ILicenseArtifactIssuer, LicenseArtifactIssuer>();

builder.Services.AddScoped<MailKitPlatformEmailSender>();
builder.Services.AddScoped<IPlatformEmailSender>(sp => sp.GetRequiredService<MailKitPlatformEmailSender>());

builder.Services.AddSingleton<IPasswordHasher, EcuPasswordHasher>();
builder.Services.AddSingleton<IPlatformJwtAccessTokenFactory, PlatformJwtAccessTokenFactory>();

builder.Services.AddPlatformLicensingBusiness();
builder.Services.AddLicensingData(licensingConnection);

var corsOrigins = ParseCorsOrigins(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "PlatformSpa",
        policy =>
        {
            if (corsOrigins.Length > 0)
            {
                policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
                return;
            }

            policy
                .SetIsOriginAllowed(static origin =>
                {
                    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    {
                        return false;
                    }

                    if (uri.Scheme is not "http" and not "https")
                    {
                        return false;
                    }

                    return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
                })
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

var app = builder.Build();

app.UseCors("PlatformSpa");
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => Results.Ok(new { service = "EcuNexo.Platform", status = "ok" }));

app.MapPlatformLicensingEndpointsV1();

var migrateOnStartup = app.Configuration.GetValue(
    "Database:MigrateOnStartup",
    defaultValue: app.Environment.IsDevelopment());
if (migrateOnStartup)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LicensingDbContext>();
    await db.Database.MigrateAsync(CancellationToken.None).ConfigureAwait(false);
}

await DevelopmentLicensingSeeder.EnsureAsync(app, CancellationToken.None).ConfigureAwait(false);
await BootstrapOperatorSeeder.EnsureAsync(app, CancellationToken.None).ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);

static string[] ParseCorsOrigins(IConfiguration configuration)
{
    var fromArray = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (fromArray is { Length: > 0 })
    {
        return fromArray
            .Select(static o => o.Trim())
            .Where(static o => o.Length > 0)
            .ToArray();
    }

    var csv = configuration["Cors:AllowedOrigins"];
    if (string.IsNullOrWhiteSpace(csv))
    {
        return [];
    }

    return csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
