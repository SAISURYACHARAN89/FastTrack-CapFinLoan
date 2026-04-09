namespace CapFinLoan.Auth.Application.Exceptions;

public sealed class InvalidSignupOtpVerificationException : Exception
{
    public InvalidSignupOtpVerificationException()
        : base("Email OTP verification is required before signup.")
    {
    }
}
