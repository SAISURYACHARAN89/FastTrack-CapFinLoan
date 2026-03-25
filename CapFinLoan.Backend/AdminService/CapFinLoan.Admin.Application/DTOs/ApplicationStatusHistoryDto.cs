namespace CapFinLoan.Admin.Application.DTOs;

public class ApplicationStatusHistoryDto
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public int ChangedBy { get; set; }
    public DateTime ChangedAtUtc { get; set; }
}
