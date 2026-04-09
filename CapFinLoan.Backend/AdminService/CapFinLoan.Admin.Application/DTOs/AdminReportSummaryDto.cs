namespace CapFinLoan.Admin.Application.DTOs;

public class AdminReportSummaryDto
{
    public int TotalApplications { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int PendingCount { get; set; }
    public int UnderReviewCount { get; set; }
    public decimal TotalRequestedAmount { get; set; }
    public decimal ApprovedTotalAmount { get; set; }
    public decimal AverageRequestedAmount { get; set; }
    public decimal AverageApprovedAmount { get; set; }
    public decimal ApprovalRatePercent { get; set; }
    public decimal RejectionRatePercent { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
}
