using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CapFinLoan.Auth.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAnnualIncomeAndProfilePhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AnnualIncome",
                table: "Users",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoDataUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnnualIncome",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoDataUrl",
                table: "Users");
        }
    }
}
