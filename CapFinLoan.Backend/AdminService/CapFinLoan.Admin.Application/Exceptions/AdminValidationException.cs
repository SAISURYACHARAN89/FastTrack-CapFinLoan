namespace CapFinLoan.Admin.Application.Exceptions;

public sealed class AdminValidationException : InvalidOperationException
{
    public AdminValidationException(string message) : base(message)
    {
    }
}
