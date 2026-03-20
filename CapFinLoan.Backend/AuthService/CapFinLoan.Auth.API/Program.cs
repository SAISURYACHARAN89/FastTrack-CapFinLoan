using CapFinLoan.Auth.Persistence;
using CapFinLoan.Auth.Application.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services

builder.Services.AddControllers();

builder.Services.AddDbContext<AuthDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration.GetConnectionString("Default")
    ));

builder.Services.AddScoped<AuthService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Middleware

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthorization();

app.MapControllers();

app.Run();