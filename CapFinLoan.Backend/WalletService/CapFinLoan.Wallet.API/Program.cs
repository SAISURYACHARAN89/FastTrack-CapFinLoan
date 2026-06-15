using System.Text;
using CapFinLoan.Wallet.API.Middleware;
using CapFinLoan.Wallet.API.Persistence;
using CapFinLoan.Wallet.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<WalletDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Services
builder.Services.AddScoped<WalletService>();

// JWT Authentication — same key/issuer/audience as all other services
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JWT Key is too short. Use at least 32 bytes.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5021",
                "http://127.0.0.1:5021")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Create schema on startup — idempotent IF NOT EXISTS guards, safe on every restart
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WalletDbContext>();

    // Retry loop — SQL Server may not be ready immediately on first container start
    var retries = 0;
    while (true)
    {
        try
        {
            db.Database.ExecuteSqlRaw("""
                IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CapFinLoanWallet')
                BEGIN
                    EXEC('CREATE DATABASE CapFinLoanWallet')
                END
                """);
            break;
        }
        catch when (retries++ < 10)
        {
            Thread.Sleep(2000);
        }
    }

    db.Database.ExecuteSqlRaw("""
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Wallets' AND xtype='U')
        CREATE TABLE Wallets (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            UserId INT NOT NULL,
            AvailableBalancePaise BIGINT NOT NULL DEFAULT 0,
            PendingBalancePaise BIGINT NOT NULL DEFAULT 0,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Wallets_UserId' AND object_id = OBJECT_ID('Wallets'))
            CREATE UNIQUE INDEX IX_Wallets_UserId ON Wallets(UserId);

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Transactions' AND xtype='U')
        CREATE TABLE Transactions (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            UserId INT NOT NULL,
            Type NVARCHAR(10) NOT NULL,
            Category NVARCHAR(30) NOT NULL,
            AmountPaise BIGINT NOT NULL,
            Status NVARCHAR(10) NOT NULL,
            ReferenceId NVARCHAR(200) NULL,
            Note NVARCHAR(500) NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Transactions_UserId' AND object_id = OBJECT_ID('Transactions'))
            CREATE INDEX IX_Transactions_UserId ON Transactions(UserId);

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WithdrawalRequests' AND xtype='U')
        CREATE TABLE WithdrawalRequests (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            UserId INT NOT NULL,
            AmountPaise BIGINT NOT NULL,
            Status NVARCHAR(20) NOT NULL,
            BankAccount NVARCHAR(50) NULL,
            IfscCode NVARCHAR(20) NULL,
            AccountHolderName NVARCHAR(200) NULL,
            AdminNote NVARCHAR(500) NULL,
            ReviewedByAdminId INT NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_WithdrawalRequests_UserId' AND object_id = OBJECT_ID('WithdrawalRequests'))
            CREATE INDEX IX_WithdrawalRequests_UserId ON WithdrawalRequests(UserId);
        """);
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
