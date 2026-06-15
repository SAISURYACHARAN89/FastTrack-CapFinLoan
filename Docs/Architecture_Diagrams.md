# CapFinLoan System Architecture Diagrams

This document contains all the UML diagrams for the CapFinLoan microservices project.

---

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        FE["🖥️ React Frontend<br/>Port: 5173"]
    end

    subgraph "API Gateway Layer"
        GW["⚙️ Ocelot Gateway<br/>Port: 5021"]
    end

    subgraph "Microservices"
        AUTH["🔐 Auth Service<br/>Port: 5000<br/>─────────<br/>• SignUp/Login<br/>• JWT Generation<br/>• Google Auth<br/>• OTP Verification"]

        APP["📋 Application Service<br/>Port: 5001<br/>─────────<br/>• Loan Applications<br/>• Application Status<br/>• Status Tracking"]

        DOC["📄 Document Service<br/>Port: 5002<br/>─────────<br/>• Document Upload<br/>• File Storage<br/>• Document Status"]

        ADMIN["👨‍💼 Admin Service<br/>Port: 5003<br/>─────────<br/>• Decision Making<br/>• Admin Queue<br/>• Reports Generation"]
    end

    subgraph "Message Queue"
        RABBIT["🐰 RabbitMQ<br/>Port: 5672<br/>─────────<br/>• Event Publishing<br/>• Service Communication"]
    end

    subgraph "Data Layer"
        DB1["🗄️ CapFinLoanAuth<br/>MSSQL"]
        DB2["🗄️ CapFinLoanApplication<br/>MSSQL"]
        DB3["🗄️ CapFinLoanDocument<br/>MSSQL"]
        DB4["🗄️ CapFinLoanAdmin<br/>MSSQL"]
        STORAGE["☁️ Document Storage<br/>Uploads Volume"]
    end

    subgraph "External Services"
        GOOGLE["🔵 Google OAuth<br/>Authentication"]
        SMTP["📧 Gmail SMTP<br/>Email Notifications"]
    end

    FE -->|HTTP Requests| GW
    GW -->|Routes| AUTH
    GW -->|Routes| APP
    GW -->|Routes| DOC
    GW -->|Routes| ADMIN

    AUTH -->|Stores/Queries| DB1
    APP -->|Stores/Queries| DB2
    DOC -->|Stores/Queries| DB3
    ADMIN -->|Stores/Queries| DB4

    APP -->|Publishes/Subscribes| RABBIT
    DOC -->|Publishes/Subscribes| RABBIT
    ADMIN -->|Publishes/Subscribes| RABBIT

    DOC -->|Stores Files| STORAGE

    AUTH -->|Validates Token| GOOGLE
    ADMIN -->|Sends Email| SMTP

    classDef service fill:#4f46e5,stroke:#312e81,color:#fff,stroke-width:2px
    classDef db fill:#059669,stroke:#065f46,color:#fff,stroke-width:2px
    classDef external fill:#dc2626,stroke:#7f1d1d,color:#fff,stroke-width:2px
    classDef infrastructure fill:#7c3aed,stroke:#581c87,color:#fff,stroke-width:2px
    classDef client fill:#0891b2,stroke:#164e63,color:#fff,stroke-width:2px

    class AUTH,APP,DOC,ADMIN service
    class DB1,DB2,DB3,DB4,STORAGE db
    class GOOGLE,SMTP external
    class RABBIT,GW infrastructure
    class FE client
```

---

## 2. Database Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ APPLICATION : submits
    USER ||--o{ DOCUMENT : uploads
    APPLICATION ||--o{ DOCUMENT : requires
    APPLICATION ||--o{ APPLICATION_STATUS_HISTORY : tracks
    APPLICATION ||--o{ ADMIN_DECISION : "awaits decision"
    ADMIN_DECISION ||--o{ APPLICATION_STATUS_HISTORY : creates

    USER {
        int UserId PK
        string Name
        string Email UK
        string PasswordHash
        string Role "APPLICANT|ADMIN"
        boolean IsActive
        datetime CreatedAtUtc
    }

    APPLICATION {
        int ApplicationId PK
        int UserId FK
        decimal Amount
        int TenureMonths
        string Status "PENDING|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED"
        datetime CreatedAtUtc
        datetime UpdatedAtUtc
    }

    DOCUMENT {
        int DocumentId PK
        int ApplicationId FK
        int UserId FK
        string DocumentType "PAN|AADHAR"
        string FileName
        string BlobFileName
        string Status "PENDING|VERIFIED|REJECTED"
        datetime UploadedAtUtc
    }

    APPLICATION_STATUS_HISTORY {
        int HistoryId PK
        int ApplicationId FK
        string OldStatus
        string NewStatus
        string Remarks
        int ChangedBy FK "Admin UserId"
        datetime ChangedAtUtc
    }

    ADMIN_DECISION {
        int DecisionId PK
        int ApplicationId FK
        string Decision "APPROVED|REJECTED|UNDER_REVIEW"
        decimal ApprovedAmount
        int TenureMonths
        decimal InterestRate
        string Remarks
        int CreatedBy FK "Admin UserId"
        datetime CreatedAtUtc
    }
```

---

## 3. User Journey - Loan Application Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    actor Applicant as 👤 Applicant
    participant Frontend as 🖥️ Frontend
    participant Gateway as ⚙️ Gateway
    participant Auth as 🔐 Auth Service
    participant App as 📋 App Service
    participant Doc as 📄 Doc Service
    participant Queue as 🐰 RabbitMQ
    participant Admin as 👨‍💼 Admin Service
    participant SMTP as 📧 Email

    rect rgb(200, 150, 255)
    Note over Applicant,Auth: 1️⃣ SIGNUP & LOGIN PHASE
    Applicant->>Frontend: Sign Up with Email
    Frontend->>Gateway: POST /auth/signup
    Gateway->>Auth: Create User
    Auth->>Auth: Hash Password, Generate JWT
    Auth-->>Frontend: User Created + Token
    end

    rect rgb(200, 180, 255)
    Note over Applicant,App: 2️⃣ APPLICATION SUBMISSION PHASE
    Applicant->>Frontend: Fill Loan Application Form
    Frontend->>Gateway: POST /applications
    Gateway->>App: Create Application (PENDING)
    App->>App: Validate Amount & Tenure
    App->>App: Status: PENDING → SUBMITTED
    App->>Queue: Publish: application.submitted
    Queue->>Admin: Receive: application.submitted
    App-->>Frontend: Application Created (ID: 123)
    end

    rect rgb(200, 200, 255)
    Note over Applicant,Doc: 3️⃣ DOCUMENT UPLOAD PHASE
    Applicant->>Frontend: Upload PAN & AADHAR
    Frontend->>Gateway: POST /documents/upload
    Gateway->>Doc: Save Document Files
    Doc->>Doc: Store: Status = PENDING
    Doc->>Queue: Publish: document.uploaded
    Doc-->>Frontend: Documents Uploaded ✓
    end

    rect rgb(180, 200, 255)
    Note over Applicant,Admin: 4️⃣ ADMIN REVIEW PHASE
    Admin->>Frontend: View Application Queue
    Frontend->>Gateway: GET /admin/applications
    Gateway->>Admin: Fetch Queue
    Admin->>App: Get Application Details
    Admin->>Doc: Get Document Files
    Admin->>Admin: Verify Documents (VERIFIED)
    Admin->>Queue: Publish: document.verified
    end

    rect rgb(150, 200, 255)
    Note over Admin,App: 5️⃣ ADMIN DECISION PHASE
    Admin->>Frontend: Make Decision: APPROVED
    Frontend->>Gateway: POST /admin/decision
    Gateway->>Admin: Process Decision
    Admin->>App: Update Status → APPROVED
    Admin->>Queue: Publish: admin.decision.made
    Admin-->>Frontend: Decision Recorded ✓
    end

    rect rgb(150, 180, 255)
    Note over SMTP,Applicant: 6️⃣ NOTIFICATION PHASE
    Queue->>Admin: receive: admin.decision.made
    Admin->>SMTP: Send Decision Email
    SMTP->>Applicant: 📧 "Your Loan is Approved!"
    end

    rect rgb(150, 150, 255)
    Note over Applicant,Frontend: 7️⃣ APPLICANT CHECKS RESULT
    Applicant->>Frontend: Check Application Status
    Frontend->>Gateway: GET /applications/123
    Gateway->>App: Fetch Application
    App-->>Frontend: Status: APPROVED
    Frontend->>Applicant: ✅ Loan Approved!
    end
```

---

## 4. Event-Driven Architecture & Service Communication

```mermaid
graph LR
    subgraph "Services"
        AUTH["🔐 Auth<br/>Service"]
        APP["📋 Application<br/>Service"]
        DOC["📄 Document<br/>Service"]
        ADMIN["👨‍💼 Admin<br/>Service"]
    end

    subgraph "Events via RabbitMQ"
        E1["📤 application.<br/>submitted"]
        E2["📤 document.<br/>uploaded"]
        E3["📤 document.<br/>replaced"]
        E4["📤 admin.<br/>decision.made"]
        E5["📤 document.<br/>verified"]
    end

    subgraph "Event Listeners"
        L1["listener: admin.<br/>application.<br/>submitted.queue"]
        L2["listener: application.<br/>admin.decision.<br/>queue"]
    end

    APP -->|publishes| E1
    DOC -->|publishes| E2
    DOC -->|publishes| E3
    DOC -->|publishes| E5
    ADMIN -->|publishes| E4

    E1 -->|consumed by| L1
    E4 -->|consumed by| L2

    L1 -->|triggers| ADMIN
    L2 -->|triggers| APP

    AUTH -.->|validates JWT| APP
    AUTH -.->|validates JWT| DOC
    AUTH -.->|validates JWT| ADMIN

    ADMIN -.->|syncs status| APP
    ADMIN -.->|verifies docs| DOC

    classDef service fill:#4f46e5,stroke:#312e81,color:#fff,stroke-width:2px
    classDef event fill:#f97316,stroke:#9a3412,color:#fff,stroke-width:2px
    classDef listener fill:#8b5cf6,stroke:#5b21b6,color:#fff,stroke-width:2px

    class AUTH,APP,DOC,ADMIN service
    class E1,E2,E3,E4,E5 event
    class L1,L2 listener
```

---

## Export Instructions

To export these diagrams as PNG images:

### Option 1: Using Mermaid Live Editor

1. Visit https://mermaid.live
2. Copy any diagram code from above
3. Paste into the editor
4. Click "Download" → Select PNG format

### Option 2: Using VS Code

1. Install "Markdown Preview Mermaid Support" extension
2. Open this file in VS Code
3. Preview the markdown
4. Right-click on diagram → Save as PNG

### Option 3: Command Line (Linux/Mac)

```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i architecture.mmd -o architecture.png
```

---

## Key Components Summary

| Component            | Port | Purpose                     |
| -------------------- | ---- | --------------------------- |
| React Frontend       | 5173 | User interface              |
| API Gateway (Ocelot) | 5021 | Route requests to services  |
| Auth Service         | 5000 | User authentication & JWT   |
| Application Service  | 5001 | Loan application management |
| Document Service     | 5002 | Document upload & storage   |
| Admin Service        | 5003 | Admin decisions & approvals |
| RabbitMQ             | 5672 | Event messaging & pub-sub   |
| MSSQL Databases      | 1433 | Data persistence (4 DBs)    |

---

**Created:** April 16, 2026  
**Project:** CapFinLoan Microservices Platform
