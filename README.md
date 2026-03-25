# CapFinLoan (FastTrack)

**Production-grade microservices architecture for loan fintech platform.**

## Current Implementation Status (Backend)

This repo currently contains **4 implemented microservices** with **SQL Server + EF Core Code-First** + **JWT security**.

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

# AdminService DB
dotnet ef database update \
  --project CapFinLoan.Backend/AdminService/CapFinLoan.Admin.Persistence \
  --startup-project CapFinLoan.Backend/AdminService/CapFinLoan.Admin.API \
  --context AdminDbContext

```bash
# Terminal 1: AuthService (port 5000)
dotnet run --project CapFinLoan.Backend/AuthService/CapFinLoan.Auth.API

# Terminal 2: ApplicationService (port 5001)
dotnet run --project CapFinLoan.Backend/ApplicationService/CapFinLoan.Application.API

# Terminal 3: DocumentService (port 5002)
dotnet run --project CapFinLoan.Backend/DocumentService/CapFinLoan.Document.API

# Terminal 4: AdminService (port 5003)
dotnet run --project CapFinLoan.Backend/AdminService/CapFinLoan.Admin

# Terminal 2: ApplicationService (port 5001)
dotnet run --project CapFinLoan.Backend/ApplicationService/CapFinLoan.Application.API
4. **Admin Decision:** `POST http://localhost:5003/admin/applications/{id}/decision` (admin token)

See [Thunder Client Guide](#testing-guide) below for details.

---

### 4) AdminService (Admin Queue/Decisions) — Production Ready

**What's implemented**
- View application queue (admin-only)
- Make decisions (APPROVED / REJECTED / UNDER_REVIEW)
- Track decision history with full audit trail
- View application status timeline
- Verify documents (VERIFIED / REJECTED states)
- Generate admin report summary (counts, totals, approvals)
- Role-based authorization (`[Authorize(Roles="ADMIN")]`)
- Full status flow traceability

**Status flow**
- Applicant: `PENDING` → `SUBMITTED`
- Admin: `SUBMITTED` → `UNDER_REVIEW` → (`APPROVED` / `REJECTED`)
- Decision includes: decision type, remarks, approved amount, tenure, interest rate

**Database**
- SQL Server DB: `CapFinLoanAdmin`
- Tables: `AdminDecisions`, `ApplicationStatusHistories`
- Full audit trail with `ChangedBy` and timestamps

**Endpoints (all require `[Authorize(Roles="ADMIN")]`)**
- `GET /admin/applications` — View queue
- `POST /admin/applications/{id}/decision` — Make decision
- `GET /admin/applications/{id}/history` — View status timeline/audit trail
- `POST /admin/documents/{id}/verify` — Verify document (VERIFIED/REJECTED)
- `GET /admin/reports/summary` — Get summary report
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
- Track application status timeline (owner-only)
- Admin decision/status updates (role `ADMIN`)
- Get application by id (owner-only)
- Get applications of logged-in user
- Uses JWT `ClaimTypes.NameIdentifier` as `userId`
- EF Core + Repository pattern + DTOs + Clean Architecture layering
- All endpoints require `[Authorize]`

**Status values**
- Applicant flow: `PENDING` → `SUBMITTED`
- Admin flow: `UNDER_REVIEW` / `APPROVED` / `REJECTED`
- Decision fields (when `APPROVED`/`REJECTED`): `DecisionReason`, `DecidedAtUtc`

**Database**
- SQL Server DB: `CapFinLoanApplication`
- Tables: `LoanApplications`, `ApplicationStatusHistories`

**Endpoints**
- `POST /applications`
- `PUT /applications/{id}` — Update my PENDING application
- `POST /applications/{id}/submit` — Submit my PENDING application (Status → SUBMITTED)
- `GET /applications/{id}`
- `GET /applications/my`
- `GET /applications/{id}/timeline` — Status timeline (owner-only)
- `POST /applications/{id}/status` — Admin-only status/decision update (`ADMIN` role)

### 3) DocumentService (Loan Documents) — Completed (MVP)

**What’s implemented**
- Upload documents for a loan application (metadata stored in DB; file stored on disk)
- ReAdmin Test Cases (TC08-TC13)

#### TC08: Admin View Queue
```
GET http://localhost:5003/admin/applications
Auth: Bearer <ADMIN_TOKEN>
Response: [ { "id": 1, "userId": 1, "amount": 100000, "status": "SUBMITTED", ... } ]
```

#### TC09: Admin Make Decision (APPROVED)
```
POST http://localhost:5003/admin/applications/1/decision
Auth: Bearer <ADMIN_TOKEN>
Body (JSON):
{
  "decision": "APPROVED",
  "remarks": "All criteria met",
  "approvedAmount": 95000,
  "tenureMonths": 60,
  "interestRate": 8.5
}
Response: { "id": 1, "applicationId": 1, "decision": "APPROVED", "approvedAmount": 95000, ... }
```

#### TC10: Admin Make Decision (REJECTED)
```
POST http://localhost:5003/admin/applications/2/decision
Auth: Bearer <ADMIN_TOKEN>
Body (JSON):
{
  "decision": "REJECTED",
  "remarks": "Income verification failed"
}
Response: { "id": 2, "applicationId": 2, "decision": "REJECTED", "remarks": "...", ... }
```

#### TC11: Admin View History/Timeline
```
GET http://localhost:5003/admin/applications/1/history
Auth: Bearer <ADMIN_TOKEN>
Response: [ 
  { "oldStatus": "PENDING", "newStatus": "SUBMITTED", "changedAt": "...", ... },
  { "oldStatus": "SUBMITTED", "newStatus": "APPROVED", "remarks": "All criteria met", ... }
]
```

#### TC12: Admin Get Report Summary
```
GET http://localhost:5003/admin/reports/summary
Auth: Bearer <ADMIN_TOKEN>
Response: { 
  "totalApplications": 10, 
  "approvedCount": 4, 
  "rejectedCount": 2, 
  "pendingCount": 4, 
  "underReviewCount": 0, 
  "approvedTotalAmount": 380000, 
  "generatedAtUtc": "..." 
}
```

#### TC13: Applicant Blocked from Admin (403 Forbidden)
```
GET http://localhost:5003/admin/applications
Auth: Bearer <APPLICANT_TOKEN>
Response: 403 Forbidden (role check fails)
```

---

### place an existing document (owner-only)
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
- `PUT /documents/{id}` (multipart/form-data) — Replace file for an existing document
- `GET /documents/application/{applicationId}`
- `DELETE /documents/{id}`

---

### 4) AdminService (Admin Queue/Decisions) — Production Ready

**What's implemented**
- View application queue (admin-only)
- Make decisions (APPROVED / REJECTED / UNDER_REVIEW)
- Track decision history with full audit trail
- View application status timeline
- Verify documents (VERIFIED / REJECTED states)
- Generate admin report summary (counts, totals, approvals)
- Role-based authorization (`[Authorize(Roles="ADMIN")]`)
- Full status flow traceability
- Cross-service integration (calls ApplicationService + DocumentService)

**Status flow**
- Applicant: `PENDING` → `SUBMITTED`
- Admin: `SUBMITTED` → `UNDER_REVIEW` → (`APPROVED` / `REJECTED`)
- Decision includes: decision type, remarks, approved amount, tenure, interest rate

**Database**
- SQL Server DB: `CapFinLoanAdmin`
- Tables: `AdminDecisions`, `ApplicationStatusHistories`
- Full audit trail with `ChangedBy` and timestamps

**Endpoints (all require `[Authorize(Roles="ADMIN")]`)**
- `GET /admin/applications` — View application queue with document counts
- `POST /admin/applications/{id}/decision` — Make decision on application
- `GET /admin/applications/{id}/history` — View status timeline/audit trail
- `POST /admin/documents/{id}/verify` — Verify document (VERIFIED/REJECTED)
- `GET /admin/reports/summary` — Get summary report (counts, totals, approvals)

---

## Architecture
PI Gateway** (Ocelot) routing (`/gateway/...`)
- **Full lifecycle flows** (email notifications on status change)
- **Document verification UI** (admin review/UI integration)
- **Application callbacks** (webhooks on status change)
- **Cross-service HTTP calls** (currently ApplicationQueueReader is simulated; should call ApplicationService & DocumentService)
- **Report export** (CSV/Excel exportsrvice
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

### 3a. Replace Document
```
PUT http://localhost:5002/documents/1
Auth: Bearer <YOUR_TOKEN>
Body: Form (not JSON)
  - File (File): [select a .pdf/.jpg/.png]
Response: { "id": 1, "applicationId": 1, "fileName": "...", "status": "PENDING", ... }
```

### 3b. Submit Application
```
POST http://localhost:5001/applications/1/submit
Auth: Bearer <YOUR_TOKEN>
Response: { "id": 1, "status": "SUBMITTED", ... }
```

### 3c. View Status Timeline
```
GET http://localhost:5001/applications/1/timeline
Auth: Bearer <YOUR_TOKEN>
Response: [ { "status": "PENDING", ... }, { "status": "SUBMITTED", ... } ]
```

### 3d. Admin Decision / Status Update
```
POST http://localhost:5001/applications/1/status
Auth: Bearer <ADMIN_TOKEN>
Body (JSON):
{
  "status": "APPROVED",
  "reason": "Meets eligibility criteria"
}
Response: { "id": 1, "status": "APPROVED", "decisionReason": "...", "decidedAtUtc": "...", ... }
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
- **API Gateway** (Ocelot) routing (`/gateway/...`)
- **Full lifecycle flows** (email notifications on status change)
- **Document verification UI** (admin review/UI integration)
- **Application callbacks** (webhooks on status change)
- **Report export** (CSV/Excel exports)
