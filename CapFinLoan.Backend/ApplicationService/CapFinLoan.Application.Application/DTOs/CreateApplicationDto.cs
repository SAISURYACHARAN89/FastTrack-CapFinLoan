using System.ComponentModel.DataAnnotations;

namespace CapFinLoan.Application.Application.DTOs;

public class CreateApplicationDto
{
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Range(1, 600)]
    public int TenureMonths { get; set; }
}
