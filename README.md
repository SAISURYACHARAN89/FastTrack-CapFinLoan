# CapFinLoan (FastTrack)

**Production-grade microservices architecture for loan fintech platform.**

## Current Implementation Status (Backend)

This repo currently contains **3 implemented microservices** with **SQL Server + EF Core Code-First** + **JWT security**.

---

## Quick Start

### Prerequisites
- **.NET 10** SDK
- **SQL Server** (Docker: `docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Password@123" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest`)
- **Thunder Client** or **Postman** for testing

### Setup Databases
Run these commands from repo root to create all 3 databases:

```bash
# AuthService DB
dotnet ef database update \
  --project CapFinLoan.Backend/AuthService/CapFinLoan.Auth.Persistence \
  --startup-project CapFinLoan.Backend/AuthService/CapFinLoan.Auth.API \
  --context AuthDbContext

# ApplicationService DB
dotnet ef database update \
  --project CapFinLoan.Backend/ApplicationService/CapFinLoan.Application.Persistence \
  --startup-project CapFinLoan.Backend/ApplicationService/CapFinLoan.Application.API \
  --context ApplicationDbContext

# DocumentService DB
dotnet ef database update \
  --project CapFinLoan.Backend/DocumentService/CapFinLoan.Document.Persistence \
  --startup-project CapFinLoan.Backend/DocumentService/CapFinLoan.Document.API \
  --context DocumentDbContext
```

### Run Services (3 separate terminals)

```bash
# Terminal 1: AuthService (port 5000)
dotnet run --project CapFinLoan.Backend/AuthService/CapFinLoan.Auth.API

# Terminal 2: ApplicationService (port 5001)
dotnet run --project CapFinLoan.Backend/ApplicationService/CapFinLoan.Application.API

# Terminal 3: DocumentService (port 5002)
dotnet run --project CapFinLoan.Backend/DocumentService/CapFinLoan.Document.API
```

### Test with Thunder Client
1. **Login:** `POST http://localhost:5000/auth/login` → copy token
2. **Create App:** `POST http://localhost:5001/applications` (with Bearer token)
3. **Upload Doc:** `POST http://localhost:5002/documents/upload` (Form body, with Bearer token)

See [Thunder Client Guide](#testing-guide) below for details.

---

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

### 3) DocumentService (Loan Documents) — Completed (MVP)

**What’s implemented**
- Upload documents for a loan application (metadata stored in DB; file stored on disk)
- List documents by application (owner-only)
- Delete document (owner-only)
- Uses JWT `ClaimTypes.NameIdentifier` as `userId`
- Max file size: 5MB
- Allowed types: pdf, jpg, png
- All endpoints require `[Authorize]`

**Database**
- SQL Server DB: `CapFinLoanDocument`
- Table: `Documents` (indexes on `ApplicationId`, `UserId`)

**File storage**
- Local folder (API content root): `uploads/`

**Endpoints**
- `POST /documents/upload` (multipart/form-data)
- `GET /documents/application/{applicationId}`
- `DELETE /documents/{id}`

---

## Architecture

- **Clean Architecture**: API → Application → Domain → Infrastructure/Persistence per service
- **Database**: SQL Server with EF Core Code-First migrations
- **Security**: JWT Bearer authentication; BCrypt password hashing
- **Repository Pattern**: Decoupled data access per service
- **Ownership**: All endpoints enforce userId from JWT claim for data isolation

---

## Testing Guide (Thunder Client)

### 1. Login (Get JWT)
```
POST http://localhost:5000/auth/login
Body (JSON):
{
  "email": "user@example.com",
  "password": "Password@123"
}
Response: { "id": 1, "email": "...", "token": "eyJ..." }
→ Copy the token
```

### 2. Create Loan Application
```
POST http://localhost:5001/applications
Auth: Bearer <YOUR_TOKEN>
Body (JSON):
{
  "amount": 100000,
  "tenureMonths": 60
}
Response: { "id": 1, "userId": 1, "amount": 100000, "status": "PENDING", ... }
→ Copy the application id (1)
```

### 3. Upload Document
```
POST http://localhost:5002/documents/upload
Auth: Bearer <YOUR_TOKEN>
Body: Form (not JSON)
  - ApplicationId (Text): 1
  - File (File): [select a .pdf/.jpg/.png]
Response: { "id": 1, "applicationId": 1, "fileName": "...", "status": "PENDING", ... }
```

### 4. List Documents
```
GET http://localhost:5002/documents/application/1
Auth: Bearer <YOUR_TOKEN>
Response: [ { "id": 1, "applicationId": 1, ... } ]
```

### 5. Delete Document
```
DELETE http://localhost:5002/documents/1
Auth: Bearer <YOUR_TOKEN>
Response: (204 No Content)
```

**Tips:**
- Save requests in Collections for reuse
- Use Environment Variables for token/baseUrl
- File upload: must be **Form** type, not JSON

---

## Not Implemented Yet

The following services/features are planned but not implemented yet:
- **AdminService** (queue, decisions, reports)
- **API Gateway** (Ocelot) routing (`/gateway/...`)
- **Full lifecycle flows** (admin status transitions, approval/rejection with notifications)
- **Document verification** (admin review, status updates)
- **Application callbacks** (webhooks on status change)
