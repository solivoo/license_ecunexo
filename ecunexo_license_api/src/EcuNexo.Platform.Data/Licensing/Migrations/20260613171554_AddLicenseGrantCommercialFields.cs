using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcuNexo.Platform.Data.Licensing.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseGrantCommercialFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_email_normalized",
                schema: "licensing",
                table: "license_grants",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "online_validation_interval_days",
                schema: "licensing",
                table: "license_grants",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<Guid>(
                name: "supersedes_grant_id",
                schema: "licensing",
                table: "license_grants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_license_grants_owner_email_normalized",
                schema: "licensing",
                table: "license_grants",
                column: "owner_email_normalized",
                unique: true,
                filter: "status IN (0, 2) AND owner_email_normalized IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_license_grants_owner_email_normalized",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "owner_email_normalized",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "online_validation_interval_days",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "supersedes_grant_id",
                schema: "licensing",
                table: "license_grants");
        }
    }
}
