using System.Text;
using CapFinLoan.Admin.API.Messaging;
using CapFinLoan.Admin.Application.Interfaces;
using CapFinLoan.Admin.Application.Services;
using CapFinLoan.Admin.Persistence;
using CapFinLoan.Admin.Persistence.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AdminDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IAdminDecisionRepository, AdminDecisionRepository>();
builder.Services.AddScoped<IAdminHistoryRepository, AdminHistoryRepository>();
builder.Services.AddScoped<IApplicationQueueReader, ApplicationQueueReader>();
builder.Services.AddSingleton<IAdminEventPublisher, RabbitMqAdminEventPublisher>();
builder.Services.AddScoped<AdminService>();
builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.AddHostedService<ApplicationSubmittedConsumer>();
builder.Services.AddHostedService<DocumentLifecycleConsumer>();

builder.Services.AddHttpContextAccessor();

// Named HTTP clients — used by ApplicationQueueReader via IHttpClientFactory (fixes C1)
builder.Services.AddHttpClient("application", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["ServiceUrls:ApplicationService"] ?? "http://localhost:5256");
});

builder.Services.AddHttpClient("document", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["ServiceUrls:DocumentService"] ?? "http://localhost:5262");
});

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("JWT Key is not configured (Jwt:Key).");
if (string.IsNullOrWhiteSpace(jwtIssuer))
    throw new InvalidOperationException("JWT Issuer is not configured (Jwt:Issuer).");
if (string.IsNullOrWhiteSpace(jwtAudience))
    throw new InvalidOperationException("JWT Audience is not configured (Jwt:Audience).");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JWT Key is too short for HS256. Use at least 32 bytes.");

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
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// M6: Global error handling
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
