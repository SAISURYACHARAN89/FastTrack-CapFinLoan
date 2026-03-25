namespace CapFinLoan.Admin.Application.DTOs;

public class AdminDecisionDto
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public string Decision { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public decimal ApprovedAmount { get; set; }
    public int TenureMonths { get; set; }
    public decimal InterestRate { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
