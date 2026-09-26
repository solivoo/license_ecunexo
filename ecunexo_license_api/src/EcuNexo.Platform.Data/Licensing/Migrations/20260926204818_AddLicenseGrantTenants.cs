using System;
using System.Collections.Generic;
using EcuNexo.Core.Tenancy;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcuNexo.Platform.Data.Licensing.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseGrantTenants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "tenant_id",
                schema: "licensing",
                table: "license_grant_entitlement_changes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tenant_name",
                schema: "licensing",
                table: "license_grant_entitlement_changes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "license_grant_tenants",
                schema: "licensing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    grant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    has_override = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    enabled_module_codes = table.Column<string>(type: "jsonb", nullable: false),
                    module_entitlements = table.Column<IReadOnlyList<ModuleEntitlement>>(type: "jsonb", nullable: true),
                    override_version = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    reported_at_utc = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    override_updated_at_utc = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                    override_updated_by_operator_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_license_grant_tenants", x => x.id);
                    table.ForeignKey(
                        name: "fk_license_grant_tenants_license_grants_grant_id",
                        column: x => x.grant_id,
                        principalSchema: "licensing",
                        principalTable: "license_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_license_grant_tenants_grant_id",
                schema: "licensing",
                table: "license_grant_tenants",
                column: "grant_id");

            migrationBuilder.CreateIndex(
                name: "ix_license_grant_tenants_grant_id_tenant_id",
                schema: "licensing",
                table: "license_grant_tenants",
                columns: new[] { "grant_id", "tenant_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "license_grant_tenants",
                schema: "licensing");

            migrationBuilder.DropColumn(
                name: "tenant_id",
                schema: "licensing",
                table: "license_grant_entitlement_changes");

            migrationBuilder.DropColumn(
                name: "tenant_name",
                schema: "licensing",
                table: "license_grant_entitlement_changes");
        }
    }
}
