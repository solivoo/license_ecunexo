using EcuNexo.Platform.Business.Abstractions;
using EcuNexo.Platform.Core.Licensing;
using EcuNexo.Core.Tenancy;
using EcuNexo.Platform.Data.Licensing;
using Microsoft.EntityFrameworkCore;

namespace EcuNexo.Platform.Api.Development;

public static class DevelopmentLicensingSeeder
{
    public const string SeedOperatorEmail = "admin.licencias@ecunexo.local";

    public const string SeedOperatorPassword = "Licencias123!";

    public static async Task EnsureAsync(WebApplication app, CancellationToken ct)
    {
        if (!app.Environment.IsDevelopment())
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LicensingDbContext>();
        await db.Database.MigrateAsync(ct).ConfigureAwait(false);

        await EnsurePlansAsync(db, ct).ConfigureAwait(false);
        await EnsureOperatorAsync(scope.ServiceProvider, db, ct).ConfigureAwait(false);
        await EnsureSampleCustomerAsync(db, ct).ConfigureAwait(false);
    }

    public static readonly Guid SeedCustomerId = Guid.Parse("01930000-0000-7000-8000-000000000001");

    private static async Task EnsureSampleCustomerAsync(LicensingDbContext db, CancellationToken ct)
    {
        if (await db.Customers.AnyAsync(c => c.Id == SeedCustomerId, ct).ConfigureAwait(false))
        {
            return;
        }

        var created = LicensingCustomer.Create(
            SeedCustomerId,
            "Cliente Demo Ecuador S.A.",
            LicensingDeploymentMode.CloudShared,
            taxId: "1799999999001",
            tradeName: "Demo Ecunexo",
            contactEmail: "contacto@demo.ecunexo.local");
        if (created.IsFailure)
        {
            return;
        }

        db.Customers.Add(created.Value!);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static async Task EnsurePlansAsync(LicensingDbContext db, CancellationToken ct)
    {
        var specs = new (string Code, string Name, string Description, int Tenants, int Users, int Warehouses, string[] Modules, decimal Price, int Sort)[]
        {
            ("pro-independiente", "Independiente",
                "Persona natural / profesional. Catálogo de servicios + factura o nota de venta. Sin bodega.",
                1, 2, 0,
                [TenantModuleCodes.Identity, TenantModuleCodes.Catalog, TenantModuleCodes.Invoicing],
                27m, 5),
            ("local-comercio", "Local",
                "Tienda de un punto. Catálogo, 1 bodega, recepción y factura.",
                1, 3, 1,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Inventory,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Invoicing,
                ],
                42m, 10),
            ("taller-mixto", "Taller",
                "Servicio + repuesto. Taller y reparaciones B2B, dos bodegas, traspaso y factura mixta.",
                1, 5, 2,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Inventory,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Invoicing,
                    TenantModuleCodes.Repairs,
                ],
                59m, 15),
            ("empresa-pyme", "Empresa",
                "PyME / sociedad. Completo + equipo (vendedor vs admin). 3 bodegas.",
                1, 10, 3,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Inventory,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Invoicing,
                ],
                79m, 20),
            ("cadena-retail", "Cadena",
                "Varios locales, un RUC. Mismos módulos; más cupo de gente y bodegas.",
                1, 20, 8,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Inventory,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Invoicing,
                ],
                129m, 30),
            ("grupo-multi-ruc", "Grupo",
                "Varios RUC bajo un titular. Mismos módulos por empresa.",
                5, 25, 10,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Inventory,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Invoicing,
                ],
                199m, 40),
        };

        foreach (var spec in specs)
        {
            var created = Plan(
                spec.Code,
                spec.Name,
                spec.Description,
                spec.Tenants,
                spec.Users,
                spec.Warehouses,
                spec.Modules,
                spec.Price,
                spec.Sort);
            if (created.IsFailure)
            {
                continue;
            }

            var incoming = created.Value!;
            var existing = await db.Plans.FirstOrDefaultAsync(p => p.Code == incoming.Code, ct)
                .ConfigureAwait(false);
            if (existing is null)
            {
                db.Plans.Add(incoming);
                continue;
            }

            existing.Update(
                incoming.DisplayName,
                incoming.Description,
                incoming.MaxTenantsDefault,
                incoming.MaxUsersDefault,
                incoming.MaxWarehousesDefault,
                incoming.EnabledModuleCodesDefault,
                BuildPlanEntitlements(incoming.EnabledModuleCodesDefault),
                incoming.SuggestedPriceUsdMonthly,
                incoming.SortOrder);
            if (!existing.IsActive)
            {
                existing.Activate();
            }
        }

        string[] retired =
        [
            "services-starter",
            "starter-cloud",
            "business-cloud",
            "retail-edge",
            "multi-empresa",
            "multi-empresa-plus",
            "enterprise-onprem",
        ];
        var obsolete = await db.Plans
            .Where(p => retired.Contains(p.Code))
            .ToListAsync(ct)
            .ConfigureAwait(false);
        if (obsolete.Count > 0)
        {
            db.Plans.RemoveRange(obsolete);
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static async Task EnsureOperatorAsync(
        IServiceProvider sp,
        LicensingDbContext db,
        CancellationToken ct)
    {
        if (await db.Operators.AnyAsync(o => o.Email == SeedOperatorEmail, ct).ConfigureAwait(false))
        {
            return;
        }

        var hasher = sp.GetRequiredService<IPasswordHasher>();
        var hash = hasher.Hash(SeedOperatorPassword);
        var created = PlatformOperator.Create(
            Guid.CreateVersion7(),
            SeedOperatorEmail,
            "Administrador Licencias",
            hash,
            PlatformOperatorRole.SuperAdmin);
        if (created.IsFailure)
        {
            return;
        }

        db.Operators.Add(created.Value!);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static EcuNexo.Core.Common.Result<LicensingPlan> Plan(
        string code,
        string name,
        string description,
        int tenants,
        int users,
        int warehouses,
        string[] modules,
        decimal price,
        int sort) =>
        LicensingPlan.Create(
            code,
            name,
            tenants,
            users,
            warehouses,
            modules,
            BuildPlanEntitlements(modules),
            sort,
            price,
            description);

    private static List<ModuleEntitlement> BuildPlanEntitlements(IReadOnlyList<string> modules)
    {
        var entitlements = new List<ModuleEntitlement>(modules.Count);
        foreach (var m in modules)
        {
            var normalized = m.Trim().ToLowerInvariant();
            if (normalized == TenantModuleCodes.Repairs)
            {
                entitlements.Add(ModuleEntitlement.FromTierWithOverrides(
                    TenantModuleCodes.Repairs,
                    ModuleTier.Medium,
                    new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                    {
                        [ModuleTierCatalog.LimitMaxActiveBatches] = 50,
                        [ModuleTierCatalog.LimitMaxEquipmentsPerBatch] = 500,
                    }));
            }
            else
            {
                var tier = normalized == TenantModuleCodes.Catalog ? ModuleTier.Big : ModuleTier.Small;
                entitlements.Add(ModuleEntitlement.FromTier(normalized, tier));
            }
        }
        return entitlements;
    }
}
