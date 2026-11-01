using EcuNexo.Core.Tenancy;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcuNexo.Platform.Data.Licensing.Migrations;

/// <inheritdoc />
public partial class AddModuleEntitlements : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<IReadOnlyList<ModuleEntitlement>>(
            name: "module_entitlements_default",
            schema: "licensing",
            table: "plans",
            type: "jsonb",
            nullable: true);

        migrationBuilder.AddColumn<IReadOnlyList<ModuleEntitlement>>(
            name: "module_entitlements",
            schema: "licensing",
            table: "license_grants",
            type: "jsonb",
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "module_entitlements_default",
            schema: "licensing",
            table: "plans");

        migrationBuilder.DropColumn(
            name: "module_entitlements",
            schema: "licensing",
            table: "license_grants");
    }
}
