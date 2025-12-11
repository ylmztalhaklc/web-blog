using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NotFacebook.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageBase64",
                table: "PostComments",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageBase64",
                table: "PostComments");
        }
    }
}
