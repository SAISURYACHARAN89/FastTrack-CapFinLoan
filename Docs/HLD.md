# CapFinLoan - High Level Design (HLD)

## 1. Executive Summary
The **CapFinLoan** platform is a modern fintech solution designed to manage the end-to-end lifecycle of loan applications. It provides isolated pathways for secure applicant registration, KYC profile setup, remote document verification, and a comprehensive backend queue system for administrators to review and finalize loan decisions. It is built for scale, resilience, and maintainability.

## 2. System Architecture Paradigm
The system is constructed using a **Distributed Microservices Architecture**. To handle independent scalability and enforce strict logical isolation, business capabilities are sliced into four fundamental backend components connected via an asynchronous event bus and shielded by an edge API Gateway.

## 3. Technology Stack
* **Backend Framework**: .NET 10 / C# (ASP.NET Core Web API)
* **Frontend Application**: React / TypeScript (Vite)
* **Gateway**: Ocelot API Gateway
* **Database System**: Microsoft SQL Server 2022 (EF Core Code-First mapped)
* **Message Broker**: RabbitMQ
* **Containerization**: Docker & Docker Compose
* **Security & Auth**: Stateless JWT Authentication with BCrypt password hashing.

## 4. Core Microservices Overview

### 4.1. Ocelot API Gateway (Edge Routing)
* Acts as the single point of entry for all external client traffic (web and mobile apps).
* Secures the internal network by resolving route aliases (e.g., `/gateway/applications/*` mapping dynamically to internal IP/port setups) and enforcing JWT inspection at the network edge.

### 4.2. Identity & Auth Service
* Manages user onboarding, Google OAuth integrations, and Email-based OTP flows.
* Acts as the custodian of the User KYC profile (banking details, physical address, and basic identity attributes).
* Independent Database: `CapFinLoanAuth`

### 4.3. Loan Application Service
* Orchestrates the active creation, tracking, and modification of loan applications by the borrower.
* Manages the "Application Submission Saga"—a distributed orchestration engine ensuring an application passes successfully to the Admin pool without system failure.
* Independent Database: `CapFinLoanApplication`

### 4.4. Document Service
* Provides secure asset storage and retrieval. Binds applicant-uploaded PDF/JPG/PNG artifacts securely to application scopes.
* Broadcasts storage notifications to the event bus.
* Independent Database: `CapFinLoanDocument`

### 4.5. Admin Processing Service
* The primary backend driver for loan administrators. Provides high-level visibility over the ecosystem.
* Generates analytic dashboards, manages active queues, and finalizes `Under Review`, `Approved`, or `Rejected` decisions. Automatically synchronizes decisions upstream via RabbitMQ.
* Independent Database: `CapFinLoanAdmin`

## 5. Information Flow & Messaging
To eliminate horizontal coupling between the Microservices, an **Event-Driven Architecture (EDA)** is heavily employed utilizing **RabbitMQ**.

1. When a user submits an application, `ApplicationService` drops an `application.submitted` event into the message broker.
2. When a borrower uploads a document, `DocumentService` drops a `document.uploaded` event.
3. The `AdminService` subscribes to these streams without holding real-time dependencies on the originating services. It buffers them asynchronously to construct its internal queue.
4. Once an Admin issues an approval, a reciprocal `admin.decision.made` event propagates backward down the message queue to finalize the status dynamically.

## 6. Security Boundaries
* **Database-per-service**: Microservices do not share database schemas. They cross document updates solely via safe, documented events.
* **Role-Based Authorization Policies**: Routes natively evaluate user identity claims preventing horizontal escalation (Applicant vs Administrator access rights are strictly delineated).
