# CapFinLoan (FastTrack)

**Production-grade microservices architecture for loan fintech platform.**

## Current Implementation Status (Backend)

This repo contains a production-grade microservices backend with:

- **4 implemented microservices** (Auth, Application, Document, Admin)
- **Ocelot API Gateway** (all APIs accessible via `/gateway/*`)
- **SQL Server + EF Core Code-First**
- **RabbitMQ event bus** for async inter-service events
- **JWT Authentication & Role-based Authorization**

### Microservices & Gateway

| Service            | Port | Description                 |
| ------------------ | ---- | --------------------------- |
| AuthService        | 5000 | User signup/login, JWT      |
| ApplicationService | 5001 | Loan application workflow   |
| DocumentService    | 5002 | Document upload/verify      |
| AdminService       | 5003 | Admin queue, decisions      |
| API Gateway        | 5021 | Ocelot gateway (entrypoint) |

**All client requests must go through the gateway:**
`http://localhost:5021/gateway/*`

Direct access to downstream services is blocked in production.

---

---

## Quick Start

### Prerequisites

- **.NET 10** SDK
- **SQL Server** (Docker: `docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Password@123" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest`)
- **RabbitMQ** (Docker: `docker run -d --name capfin-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management`)
- **Thunder Client**, **Postman**, or **curl** for testing

### Local Infrastructure (Recommended)

From the `FastTrack-CapFinLoan` folder, start the full Docker stack (Frontend + Gateway + all microservices + RabbitMQ):

```bash
docker compose up -d
```

This compose setup assumes SQL Server is already running externally on `localhost:1433` (for example your existing `sqledge` container). No extra SQL container is started by compose.

If you have services already running via `dotnet run`, stop them first to avoid host port conflicts (`5000`, `5001`, `5002`, `5003`, `5021`, `5173`).

Check containers and health:

```bash
docker compose ps
```

Frontend and APIs:

- Frontend: `http://localhost:5173`
- Gateway: `http://localhost:5021`
- AuthService: `http://localhost:5000`
- ApplicationService: `http://localhost:5001`
- DocumentService: `http://localhost:5002`
- AdminService: `http://localhost:5003`

Gateway CORS allows local frontend origins:

- `http://localhost:4200`
- `http://localhost:5173`
- `http://localhost:5174`

RabbitMQ Management UI:

- URL: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

Stop infrastructure:

```bash
docker compose down
```

### Setup Databases

Run these commands from repo root to create all 4 databases:

````bash
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


### Start All Services
Open 5 terminals and run:

# AuthService (port 5000)
- View application queue (admin-only)

# ApplicationService (port 5001)
- Make decisions (APPROVED / REJECTED / UNDER_REVIEW)

# DocumentService (port 5002)
- Track decision history with full audit trail

# AdminService (port 5003)
- View application status timeline

# API Gateway (port 5021)
- Verify documents (VERIFIED / REJECTED states)
- Generate live admin report analytics (counts, totals, rates, averages)
- Export admin reports from the frontend dashboard as CSV (summary + application queue rows)
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
- `GET /admin/reports/summary` — Get live summary report (totals, approval/rejection rates, average requested/approved amounts, queue status counts)
dotnet run --project CapFinLoan.Backend/DocumentService/CapFinLoan.Document.API
````

### Test via Ocelot Gateway

All requests must go through the gateway (port 5021):

#### AuthService

```sh
curl -X POST http://localhost:5021/gateway/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@example.com","phone":"1234567890","password":"YourStrongPassword123!"}'
```

```sh
curl -X POST http://localhost:5021/gateway/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"YourStrongPassword123!"}'
```

#### ApplicationService

```sh
curl -X GET http://localhost:5021/gateway/applications/my \
  -H "Authorization: Bearer <user_token>"
```

#### DocumentService

```sh
curl -X POST http://localhost:5021/gateway/documents/upload \
  -H "Authorization: Bearer <user_token>" \
  -F "file=@/path/to/your/document.pdf"
```

#### AdminService (admin only)

```sh
curl -X GET http://localhost:5021/gateway/admin/applications \
  -H "Authorization: Bearer <admin_token>"
```

See the full list of endpoint test commands in the project documentation or above.

---

### 1) AuthService (Identity/Auth) — Completed

**What’s implemented**

- Signup + Login
- Password hashing using BCrypt
- JWT token issued on login
- JWT validation middleware + `[Authorize]` support
- Unique email enforced (DB unique index) + input validation on DTOs
- Post-login profile setup and update (applicant KYC-style details)

**Database**

- SQL Server DB: `CapFinLoanAuth`
- Table: `Users` (unique index on `Email`)
- Profile fields: `MobileNumber`, `Address`, `DateOfBirth`, `EmploymentStatus`, `BankName`, `BankAccountNumber`, `IfscCode`, `AnnualIncome`, `ProfilePhotoDataUrl`

**Endpoints**

- `POST /auth/signup`
- `POST /auth/login` → returns JWT
- `GET /auth/me` → get current authenticated user profile (includes `IsProfileComplete`)
- `PUT /auth/profile` → update applicant profile fields required for loan application (including annual income and profile photo)
- `GET /auth/users/identifiers?ids=1&ids=2` → admin-only bulk lookup for applicant identifiers (name/mobile/bank)

### 2) ApplicationService (Loan Application/Core) — Completed (MVP)

**What’s implemented**

- Create loan application (default `Status = "PENDING"`) — blocked until applicant profile setup is complete
- Update my `PENDING` or `REJECTED` application
- Submit my `PENDING` or `REJECTED` application (`Status` → `SUBMITTED`)
- Track application status timeline (owner-only)
- Admin decision/status updates (role `ADMIN`)
- Get application by id (owner-only)
- Get applications of logged-in user
- Uses JWT `ClaimTypes.NameIdentifier` as `userId`
- EF Core + Repository pattern + DTOs + Clean Architecture layering
- All endpoints require `[Authorize]`

**Status values**

- Applicant flow: `PENDING` → `SUBMITTED`; if `REJECTED`, applicant can update docs/data and resubmit (`REJECTED` → `SUBMITTED`)
- Admin flow: `UNDER_REVIEW` / `APPROVED` / `REJECTED`
- Decision fields (when `APPROVED`/`REJECTED`): `DecisionReason`, `DecidedAtUtc`

**Database**

- SQL Server DB: `CapFinLoanApplication`
- Tables: `LoanApplications`, `ApplicationStatusHistories`

**Endpoints**

- `POST /applications` — Create draft (requires `auth/me.IsProfileComplete = true`)
- `PUT /applications/{id}` — Update my `PENDING` or `REJECTED` application
- `POST /applications/{id}/submit` — Submit my `PENDING` or `REJECTED` application (Status → `SUBMITTED`)
- `GET /applications/{id}`
- `GET /applications/my`
- `GET /applications/{id}/timeline` — Status timeline (owner-only)
- `POST /applications/{id}/status` — Admin-only status/decision update (`ADMIN` role)

### 3) DocumentService (Loan Documents) — Completed (MVP)

\*\*What’s implemented

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
- RabbitMQ consumer for submitted-application events (`application.submitted`)
- RabbitMQ publisher for admin decisions (`admin.decision.made`)

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

- **Microservices**: Each service has its own database, models, and endpoints.
- **Ocelot API Gateway**: All APIs are routed through `/gateway/*` and protected by JWT authentication.
- **Role-based Authorization**: Admin endpoints require `[Authorize(Roles="ADMIN")]`.
- **EF Core Code-First**: Each service manages its own migrations and schema.
- **RabbitMQ Messaging**:
- ApplicationService publishes `application.submitted` to `capfinloan.events`; AdminService consumes and records event-driven history.
- AdminService publishes `admin.decision.made`; ApplicationService consumes and applies idempotent admin status sync.
- DocumentService publishes lifecycle events to `capfinloan.events`: `document.uploaded`, `document.replaced`, `document.status.changed`, and `document.deleted`.
- AdminService consumes document lifecycle events and records timeline/audit history from queues `admin.document.uploaded.queue`, `admin.document.replaced.queue`, `admin.document.status.changed.queue`, and `admin.document.deleted.queue`.
- **Testing**: Use curl/Postman/Thunder Client via the gateway only.
- **Ownership**: All endpoints enforce userId from JWT claim for data isolation.

---

## Current Status

- All 4 microservices are production-ready and tested.
- Ocelot API Gateway is fully implemented and required for all API access.
- JWT authentication and role-based access are enforced at the gateway and service level.
- End-to-end flows (signup, login, application, document upload, admin review) are working.
- See above for sample curl commands and endpoint documentation.

---

## Next Steps

- Add mock/test data to each service for easier testing.
- Implement advanced features: email notifications, webhooks, report exports, UI integration.
- Add more integration tests and CI/CD pipeline.

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

