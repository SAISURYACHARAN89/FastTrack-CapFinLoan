# CapFinLoan (FastTrack)

## Current Implementation Status (Backend)

This repo currently contains **2 implemented microservices** with **SQL Server + EF Core Code-First**.

### 1) AuthService (Identity/Auth) — Completed

**What’s implemented**
- Signup + Login
- Password hashing using BCrypt
- JWT token issued on login
- JWT validation middleware + `[Authorize]` support
- Unique email enforced (DB unique index) + input validation on DTOs

**Database**
- SQL Server DB: `CapFinLoanAuth`
- Table: `Users` (unique index on `Email`)

**Endpoints**
- `POST /auth/signup`
- `POST /auth/login` → returns JWT

### 2) ApplicationService (Loan Application/Core) — Completed (MVP)

**What’s implemented**
- Create loan application (default `Status = "PENDING"`)
- Update my PENDING application
- Submit my PENDING application (`Status` → `SUBMITTED`)
- Get application by id (owner-only)
- Get applications of logged-in user
- Uses JWT `ClaimTypes.NameIdentifier` as `userId`
- EF Core + Repository pattern + DTOs + Clean Architecture layering
- All endpoints require `[Authorize]`

**Database**
- SQL Server DB: `CapFinLoanApplication`
- Table: `LoanApplications` (indexes on `UserId`, `CreatedAt`)

**Endpoints**
- `POST /applications`
- `PUT /applications/{id}` — Update my PENDING application
- `POST /applications/{id}/submit` — Submit my PENDING application (Status → SUBMITTED)
- `GET /applications/{id}`
- `GET /applications/my`

## Not Implemented Yet

The following services/features are planned but not implemented yet:
- DocumentService (upload + verification)
- AdminService (queue, decisions, reports)
- API Gateway (Ocelot) routing (`/gateway/...`)
- Full loan lifecycle flows (status timeline, admin-driven status transitions, approval/rejection, etc.)
