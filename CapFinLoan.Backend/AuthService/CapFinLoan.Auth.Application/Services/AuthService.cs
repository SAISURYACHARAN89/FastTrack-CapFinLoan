using CapFinLoan.Auth.Persistence;
using CapFinLoan.Auth.Domain.Entities;
using CapFinLoan.Auth.Application.DTOs;

namespace CapFinLoan.Auth.Application.Services;

public class AuthService
{
    private readonly AuthDbContext _db;

    public AuthService(AuthDbContext db)
    {
        _db = db;
    }

    public User Signup(SignupDto dto)
    {
        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = dto.Password,
            Role = "APPLICANT"
        };

        _db.Users.Add(user);
        _db.SaveChanges();

        return user;
    }

    public User? Login(LoginDto dto)
    {
        return _db.Users.FirstOrDefault(
            x => x.Email == dto.Email &&
                 x.PasswordHash == dto.Password
        );
    }
}