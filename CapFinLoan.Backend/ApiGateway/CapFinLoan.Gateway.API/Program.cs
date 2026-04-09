using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Load Ocelot configuration (base + optional environment override)
builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKey";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CapFinLoan.Auth";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "CapFinLoan.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer("Bearer", options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        // M8: consistent clock skew with downstream services
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

// CORS Policy (for Angular / Vite frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:4200",
                "http://127.0.0.1:4200",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Ocelot
builder.Services.AddOcelot(builder.Configuration);

// Swagger (for gateway-level testing)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// M6: Global error handling
builder.Services.AddProblemDetails();

var app = builder.Build();

// M6: Translate unhandled exceptions to RFC 7807 problem responses
app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseCors("AllowFrontend");

// Request logging middleware
app.Use(async (context, next) =>
{
    var logger = context.RequestServices
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("GatewayLogger");
    logger.LogInformation("Incoming request: {Method} {Path}", context.Request.Method, context.Request.Path);
    await next.Invoke();
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

await app.UseOcelot();

app.Run();
