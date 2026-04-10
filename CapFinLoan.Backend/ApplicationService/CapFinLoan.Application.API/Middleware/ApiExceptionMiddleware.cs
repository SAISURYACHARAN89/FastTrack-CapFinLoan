using System.Text.Json;
using CapFinLoan.Application.Application.Exceptions;

namespace CapFinLoan.Application.API.Middleware;

public sealed class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (statusCode, code) = Map(ex);
            _logger.LogError(
                ex,
                "Unhandled API exception. Code: {Code}, Method: {Method}, Path: {Path}, TraceId: {TraceId}",
                code,
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var payload = new
            {
                code,
                message = ex.Message,
                traceId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }

    private static (int StatusCode, string Code) Map(Exception ex) => ex switch
    {
        UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "UNAUTHORIZED"),
        ApplicationValidationException => (StatusCodes.Status400BadRequest, "VALIDATION_ERROR"),
        InvalidOperationException => (StatusCodes.Status400BadRequest, "INVALID_OPERATION"),
        _ => (StatusCodes.Status500InternalServerError, "INTERNAL_SERVER_ERROR")
    };
}
