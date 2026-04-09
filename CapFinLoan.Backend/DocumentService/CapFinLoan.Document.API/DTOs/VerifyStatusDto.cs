namespace CapFinLoan.Document.API.DTOs;

public sealed class VerifyStatusDto
{
    /// <summary>VERIFIED or REJECTED</summary>
    public string Status { get; set; } = string.Empty;
}
