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
            ("plan-a1", "Plan A1",
                "Identidad, Seguridad RBAC/ABAC, Equipos, Catálogo, Clientes y Facturación Electrónica SRI.",
                1, 3, 0,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Customers,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Invoicing,
                ],
                29m, 10),
            ("plan-b1", "Plan B1",
                "Todo Plan A1 + Inventario (Bodega inicial e ingreso de documentos) y Compras SRI.",
                1, 10, 1,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Customers,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Invoicing,
                    TenantModuleCodes.Purchases,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Inventory,
                ],
                59m, 20),
            ("plan-c1", "Plan C1",
                "Todo Plan B1 + Bodegas multi-ubicación (creación de bodegas y sucursales).",
                1, 25, 5,
                [
                    TenantModuleCodes.Identity,
                    TenantModuleCodes.Customers,
                    TenantModuleCodes.Catalog,
                    TenantModuleCodes.Invoicing,
                    TenantModuleCodes.Purchases,
                    TenantModuleCodes.Warehousing,
                    TenantModuleCodes.Inventory,
                ],
                99m, 30),
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
                BuildPlanEntitlements(incoming.Code, incoming.EnabledModuleCodesDefault),
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
            "pro-independiente",
            "local-comercio",
            "taller-mixto",
            "empresa-pyme",
            "cadena-retail",
            "grupo-multi-ruc",
        ];
        var obsolete = await db.Plans
            .Where(p => retired.Contains(p.Code))
            .ToListAsync(ct)
            .ConfigureAwait(false);
        if (obsolete.Count > 0)
        {
            var referencedCodes = await db.LicenseGrants
                .Where(g => retired.Contains(g.PlanCode))
                .Select(g => g.PlanCode)
                .Distinct()
                .ToListAsync(ct)
                .ConfigureAwait(false);
            var referencedSet = new HashSet<string>(referencedCodes, StringComparer.OrdinalIgnoreCase);

            foreach (var oldPlan in obsolete)
            {
                if (referencedSet.Contains(oldPlan.Code))
                {
                    oldPlan.Deactivate();
                }
                else
                {
                    db.Plans.Remove(oldPlan);
                }
            }
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
            BuildPlanEntitlements(code, modules),
            sort,
            price,
            description);

    private static List<ModuleEntitlement> BuildPlanEntitlements(string planCode, IReadOnlyList<string> modules)
    {
        var planTier = PlanTier(planCode);
        var maxUsers = planCode switch
        {
            "plan-a1" => 3,
            "plan-b1" => 10,
            "plan-c1" => 25,
            _ => 3,
        };
        var maxWarehouses = planCode switch
        {
            "plan-a1" => 0,
            "plan-b1" => 1,
            "plan-c1" => 5,
            _ => 1,
        };

        var entitlements = new List<ModuleEntitlement>(modules.Count);
        foreach (var m in modules)
        {
            var normalized = m.Trim().ToLowerInvariant();
            if (normalized == TenantModuleCodes.Warehousing)
            {
                entitlements.Add(ModuleEntitlement.FromTierWithOverrides(
                    TenantModuleCodes.Warehousing,
                    planTier,
                    new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                    {
                        [ModuleTierCatalog.LimitMaxWarehouses] = maxWarehouses,
                    }));
            }
            else if (normalized == TenantModuleCodes.Identity)
            {
                entitlements.Add(ModuleEntitlement.FromTierWithOverrides(
                    TenantModuleCodes.Identity,
                    planTier,
                    new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                    {
                        [ModuleTierCatalog.LimitMaxUsers] = maxUsers,
                    }));
            }
            else if (normalized == TenantModuleCodes.Customers
                || normalized == TenantModuleCodes.Purchases
                || normalized == TenantModuleCodes.Invoicing
                || normalized == TenantModuleCodes.Catalog
                || normalized == TenantModuleCodes.Inventory
                || normalized == TenantModuleCodes.Ecommerce)
            {
                entitlements.Add(ModuleEntitlement.FromTier(normalized, planTier));
            }
            else
            {
                entitlements.Add(ModuleEntitlement.FromTier(normalized, ModuleTier.Small));
            }
        }
        return entitlements;
    }

    private static ModuleTier PlanTier(string planCode) => planCode switch
    {
        "plan-a1" => ModuleTier.Small,
        "plan-b1" => ModuleTier.Medium,
        "plan-c1" => ModuleTier.Big,
        _ => ModuleTier.Small,
    };
}
