namespace CapFinLoan.Document.Application.Exceptions;

public sealed class DocumentValidationException : InvalidOperationException
{
    public DocumentValidationException(string message) : base(message)
    {
    }
}
