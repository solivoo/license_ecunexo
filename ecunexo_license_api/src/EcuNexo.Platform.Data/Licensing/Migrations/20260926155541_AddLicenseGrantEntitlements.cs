using System;
using System.Collections.Generic;
using EcuNexo.Core.Tenancy;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcuNexo.Platform.Data.Licensing.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseGrantEntitlements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "entitlements_updated_at_utc",
                schema: "licensing",
                table: "license_grants",
                type: "timestamptz",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "entitlements_updated_by_operator_id",
                schema: "licensing",
                table: "license_grants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "entitlements_version",
                schema: "licensing",
                table: "license_grants",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "license_grant_entitlement_changes",
                schema: "licensing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    grant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_enabled_module_codes = table.Column<string>(type: "jsonb", nullable: false),
                    new_enabled_module_codes = table.Column<string>(type: "jsonb", nullable: false),
                    previous_entitlements = table.Column<IReadOnlyList<ModuleEntitlement>>(type: "jsonb", nullable: true),
                    new_entitlements = table.Column<IReadOnlyList<ModuleEntitlement>>(type: "jsonb", nullable: true),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    changed_by_operator_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at_utc = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_license_grant_entitlement_changes", x => x.id);
                    table.ForeignKey(
                        name: "fk_license_grant_entitlement_changes_license_grants_grant_id",
                        column: x => x.grant_id,
                        principalSchema: "licensing",
                        principalTable: "license_grants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_license_grant_entitlement_changes_grant_id_changed_at_utc",
                schema: "licensing",
                table: "license_grant_entitlement_changes",
                columns: new[] { "grant_id", "changed_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "license_grant_entitlement_changes",
                schema: "licensing");

            migrationBuilder.DropColumn(
                name: "entitlements_updated_at_utc",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "entitlements_updated_by_operator_id",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "entitlements_version",
                schema: "licensing",
                table: "license_grants");
        }
    }
}
