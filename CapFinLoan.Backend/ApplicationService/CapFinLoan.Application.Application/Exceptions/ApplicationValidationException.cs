namespace CapFinLoan.Application.Application.Exceptions;

public sealed class ApplicationValidationException : InvalidOperationException
{
    public ApplicationValidationException(string message) : base(message)
    {
    }
}
