using DocumentEntity = CapFinLoan.Document.Domain.Entities.Document;
using Microsoft.EntityFrameworkCore;

namespace CapFinLoan.Document.Persistence;

public sealed class DocumentDbContext : DbContext
{
    public DocumentDbContext(DbContextOptions<DocumentDbContext> options) : base(options)
    {
    }

    public DbSet<DocumentEntity> Documents => Set<DocumentEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<DocumentEntity>(b =>
        {
            b.ToTable("Documents");

            b.HasKey(x => x.Id);

            b.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            b.Property(x => x.StoredFileName).HasMaxLength(255).IsRequired();
            b.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            b.Property(x => x.Status).HasMaxLength(20).IsRequired();

            b.HasIndex(x => x.ApplicationId);
            b.HasIndex(x => x.UserId);
        });
    }
}
