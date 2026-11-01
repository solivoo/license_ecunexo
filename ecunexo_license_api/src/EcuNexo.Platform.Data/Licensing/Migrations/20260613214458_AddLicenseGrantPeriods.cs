using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcuNexo.Platform.Data.Licensing.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseGrantPeriods : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "support_period_from_utc",
                schema: "licensing",
                table: "license_grants",
                type: "timestamptz",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "support_period_to_utc",
                schema: "licensing",
                table: "license_grants",
                type: "timestamptz",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "training_period_from_utc",
                schema: "licensing",
                table: "license_grants",
                type: "timestamptz",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "training_period_to_utc",
                schema: "licensing",
                table: "license_grants",
                type: "timestamptz",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "support_period_from_utc",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "support_period_to_utc",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "training_period_from_utc",
                schema: "licensing",
                table: "license_grants");

            migrationBuilder.DropColumn(
                name: "training_period_to_utc",
                schema: "licensing",
                table: "license_grants");
        }
    }
}
