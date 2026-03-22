namespace CapFinLoan.Auth.Application.Exceptions;

public sealed class EmailAlreadyExistsException : Exception
{
    public EmailAlreadyExistsException(string email)
        : base($"A user with email '{email}' already exists.")
    {
    }
}
