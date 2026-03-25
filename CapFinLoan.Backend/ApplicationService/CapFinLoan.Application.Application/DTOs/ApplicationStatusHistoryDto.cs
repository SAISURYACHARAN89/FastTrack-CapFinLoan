namespace CapFinLoan.Application.Application.DTOs;

public sealed class ApplicationStatusHistoryDto
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime ChangedAtUtc { get; set; }
    public string? Note { get; set; }
}
