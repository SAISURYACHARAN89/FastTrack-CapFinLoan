# CapFinLoan — API Testing Guide (Postman)

**Base URLs (Direct Service)**

| Service | URL |
|---|---|
| AuthService | `http://localhost:5000` |
| ApplicationService | `http://localhost:5001` |
| DocumentService | `http://localhost:5002` |
| AdminService | `http://localhost:5003` |
| WalletService | `http://localhost:5005` |
| API Gateway | `http://localhost:5021` |

> **Tip**: Set a Postman Collection Variable `{{token}}` after login and use `Bearer {{token}}` as Authorization header for all protected endpoints.

---

## 1. AUTH SERVICE — `http://localhost:5000`

---

### 1.1 Request Signup OTP

```
POST http://localhost:5000/auth/signup/request-otp
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com"
}
```

**Response**
```json
{
  "message": "OTP sent to email if it is eligible for signup."
}
```

---

### 1.2 Verify Signup OTP

```
POST http://localhost:5000/auth/signup/verify-otp
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com",
  "otp": "482910"
}
```

**Response**
```json
{
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.3 Signup (Create Account)

```
POST http://localhost:5000/auth/signup
Content-Type: application/json
```

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password@123",
  "otpVerificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "APPLICANT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isProfileComplete": false
}
```

---

### 1.4 Login

```
POST http://localhost:5000/auth/login
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com",
  "password": "Password@123"
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "APPLICANT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.5 Google OAuth Login

```
POST http://localhost:5000/auth/google
Content-Type: application/json
```

```json
{
  "idToken": "google-id-token-from-frontend"
}
```

**Response**
```json
{
  "id": 3,
  "name": "Jane Smith",
  "email": "jane.smith@gmail.com",
  "role": "APPLICANT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.6 Get My Profile

```
GET http://localhost:5000/auth/me
Authorization: Bearer {{token}}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "APPLICANT",
  "isActive": true,
  "mobileNumber": "9876543210",
  "address": "123 MG Road, Bangalore",
  "dateOfBirth": "1995-06-15T00:00:00Z",
  "employmentStatus": "Salaried",
  "bankName": "HDFC Bank",
  "bankAccountNumber": "50100123456789",
  "ifscCode": "HDFC0001234",
  "annualIncome": 800000,
  "isProfileComplete": true
}
```

---

### 1.7 Update Profile (KYC)

```
PUT http://localhost:5000/auth/profile
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "mobileNumber": "9876543210",
  "address": "123 MG Road, Bangalore - 560001",
  "dateOfBirth": "1995-06-15",
  "employmentStatus": "Salaried",
  "bankName": "HDFC Bank",
  "bankAccountNumber": "50100123456789",
  "ifscCode": "HDFC0001234",
  "annualIncome": 800000
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "APPLICANT",
  "isActive": true,
  "mobileNumber": "9876543210",
  "address": "123 MG Road, Bangalore - 560001",
  "dateOfBirth": "1995-06-15T00:00:00Z",
  "employmentStatus": "Salaried",
  "bankName": "HDFC Bank",
  "bankAccountNumber": "50100123456789",
  "ifscCode": "HDFC0001234",
  "annualIncome": 800000,
  "isProfileComplete": true
}
```

---

### 1.8 Forgot Password — Request OTP

```
POST http://localhost:5000/auth/forgot-password
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com"
}
```

**Response**
```json
{
  "message": "Password reset OTP sent to email."
}
```

---

### 1.9 Verify Reset OTP

```
POST http://localhost:5000/auth/verify-reset-otp
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com",
  "otp": "739201"
}
```

**Response**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.10 Reset Password

```
POST http://localhost:5000/auth/reset-password
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com",
  "newPassword": "NewPassword@456",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**
```json
{
  "message": "Password has been reset successfully."
}
```

---

### 1.11 Get User Identifiers (Admin Only)

```
GET http://localhost:5000/auth/users/identifiers?ids=1&ids=2&ids=3
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  { "id": 1, "name": "John Doe", "email": "john.doe@example.com" },
  { "id": 2, "name": "Jane Smith", "email": "jane.smith@example.com" }
]
```

---

## 2. APPLICATION SERVICE — `http://localhost:5001`

---

### 2.1 Create Application

> Profile must be complete before creating an application.

```
POST http://localhost:5001/applications
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "amount": 500000,
  "tenureMonths": 60
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500000,
  "tenureMonths": 60,
  "status": "PENDING",
  "decisionReason": null,
  "decidedAtUtc": null,
  "createdAt": "2026-05-08T10:00:00Z"
}
```

---

### 2.2 Update Application (Draft only)

```
PUT http://localhost:5001/applications/1
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "amount": 750000,
  "tenureMonths": 84
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 750000,
  "tenureMonths": 84,
  "status": "PENDING",
  "decisionReason": null,
  "decidedAtUtc": null,
  "createdAt": "2026-05-08T10:00:00Z"
}
```

---

### 2.3 Get Application by ID

```
GET http://localhost:5001/applications/1
Authorization: Bearer {{token}}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500000,
  "tenureMonths": 60,
  "status": "SUBMITTED",
  "decisionReason": null,
  "decidedAtUtc": null,
  "createdAt": "2026-05-08T10:00:00Z"
}
```

---

### 2.4 Get My Applications

```
GET http://localhost:5001/applications/my
Authorization: Bearer {{token}}
```

**Response**
```json
[
  {
    "id": 1,
    "userId": 1,
    "amount": 500000,
    "tenureMonths": 60,
    "status": "PENDING",
    "createdAt": "2026-05-08T10:00:00Z"
  }
]
```

---

### 2.5 Submit Application

> Deducts ₹500 fee from wallet. Wallet must have sufficient balance.

```
POST http://localhost:5001/applications/1/submit
Authorization: Bearer {{token}}
```

> No request body needed.

**Response**
```json
{
  "id": 1,
  "status": "SUBMITTED"
}
```

---

### 2.6 Get Application Timeline

```
GET http://localhost:5001/applications/1/timeline
Authorization: Bearer {{token}}
```

**Response**
```json
[
  {
    "id": 1,
    "applicationId": 1,
    "status": "PENDING",
    "changedAtUtc": "2026-05-08T10:00:00Z",
    "note": null
  },
  {
    "id": 2,
    "applicationId": 1,
    "status": "SUBMITTED",
    "changedAtUtc": "2026-05-08T10:05:00Z",
    "note": null
  }
]
```

---

### 2.7 Get All Applications Queue (Admin Only)

```
GET http://localhost:5001/applications/queue
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  {
    "id": 1,
    "userId": 1,
    "amount": 500000,
    "tenureMonths": 60,
    "status": "SUBMITTED",
    "decisionReason": null,
    "createdAt": "2026-05-08T10:00:00Z"
  },
  {
    "id": 2,
    "userId": 3,
    "amount": 300000,
    "tenureMonths": 36,
    "status": "UNDER_REVIEW",
    "decisionReason": null,
    "createdAt": "2026-05-07T09:00:00Z"
  }
]
```

---

### 2.8 Set Application Status (Admin Only)

```
POST http://localhost:5001/applications/1/status
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "status": "UNDER_REVIEW",
  "reason": "Documents under verification"
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500000,
  "tenureMonths": 60,
  "status": "UNDER_REVIEW",
  "decisionReason": "Documents under verification",
  "decidedAtUtc": "2026-05-08T11:00:00Z",
  "createdAt": "2026-05-08T10:00:00Z"
}
```

---

### 2.9 AI Chat Message

> Requires Ollama running locally with llama3.2:1b model.

```
POST http://localhost:5001/chat/message
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "message": "What is the status of my loan application?"
}
```

**Response**
```json
{
  "reply": "Your loan application #1 is currently SUBMITTED and awaiting admin review.",
  "timestamp": "2026-05-08T10:10:00Z"
}
```

---

## 3. DOCUMENT SERVICE — `http://localhost:5002`

---

### 3.1 Upload Document

> Use `form-data` in Postman. Max file size: 5MB. Allowed types: PDF, JPG, PNG.

```
POST http://localhost:5002/documents/upload
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

| Key | Type | Value |
|---|---|---|
| `file` | File | Select your PDF/JPG/PNG file |
| `applicationId` | Text | `1` |
| `documentType` | Text | `PAN` |

**DocumentType values**: `PAN`, `ITR`, `SALARY_SLIP`, `BANK_STATEMENT`, `AADHAAR`

**Response**
```json
{
  "id": 1,
  "applicationId": 1,
  "userId": 1,
  "fileName": "pan_card.pdf",
  "contentType": "application/pdf",
  "fileSize": 204800,
  "status": "PENDING",
  "documentType": "PAN",
  "uploadedAt": "2026-05-08T10:15:00Z"
}
```

---

### 3.2 Replace Document

```
PUT http://localhost:5002/documents/1
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

| Key | Type | Value |
|---|---|---|
| `file` | File | New file to replace with |

**Response**
```json
{
  "id": 1,
  "applicationId": 1,
  "userId": 1,
  "fileName": "pan_card_updated.pdf",
  "contentType": "application/pdf",
  "fileSize": 180000,
  "status": "PENDING",
  "documentType": "PAN",
  "uploadedAt": "2026-05-08T10:20:00Z"
}
```

---

### 3.3 Get Documents by Application

```
GET http://localhost:5002/documents/application/1
Authorization: Bearer {{token}}
```

**Response**
```json
[
  {
    "id": 1,
    "applicationId": 1,
    "fileName": "pan_card.pdf",
    "status": "PENDING",
    "documentType": "PAN",
    "uploadedAt": "2026-05-08T10:15:00Z"
  },
  {
    "id": 2,
    "applicationId": 1,
    "fileName": "aadhaar.jpg",
    "status": "VERIFIED",
    "documentType": "AADHAAR",
    "uploadedAt": "2026-05-08T10:16:00Z"
  }
]
```

---

### 3.4 Download Document

```
GET http://localhost:5002/documents/1/download
Authorization: Bearer {{token}}
```

> Returns the raw file stream. In Postman, click **Send and Download** to save the file.

**Response**: Raw file binary stream with headers:
```
Content-Type: application/pdf
Content-Disposition: inline; filename*=UTF-8''pan_card.pdf
```

---

### 3.5 Delete Document

```
DELETE http://localhost:5002/documents/1
Authorization: Bearer {{token}}
```

**Response**: `204 No Content`

---

### 3.6 Verify Document Status (Admin Only)

```
PUT http://localhost:5002/documents/1/verify-status
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "status": "VERIFIED"
}
```

**Status values**: `VERIFIED`, `REJECTED`

**Response**
```json
{
  "message": "Document 1 status updated to VERIFIED."
}
```

---

## 4. ADMIN SERVICE — `http://localhost:5003`

> All endpoints require `ADMIN` role JWT token.

---

### 4.1 Get Application Queue

```
GET http://localhost:5003/admin/applications
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  {
    "id": 1,
    "userId": 1,
    "applicantName": "John Doe",
    "applicantEmail": "john.doe@example.com",
    "amount": 500000,
    "tenureMonths": 60,
    "status": "SUBMITTED",
    "documentCount": 2,
    "createdAt": "2026-05-08T10:00:00Z"
  }
]
```

---

### 4.2 Make Decision

```
POST http://localhost:5003/admin/applications/1/decision
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "decision": "APPROVED",
  "remarks": "All documents verified. Profile meets eligibility criteria.",
  "approvedAmount": 450000,
  "tenureMonths": 60,
  "interestRate": 8.5
}
```

**Decision values**: `APPROVED`, `REJECTED`, `UNDER_REVIEW`

**Response**
```json
{
  "id": 1,
  "applicationId": 1,
  "decision": "APPROVED",
  "remarks": "All documents verified. Profile meets eligibility criteria.",
  "approvedAmount": 450000,
  "tenureMonths": 60,
  "interestRate": 8.5,
  "createdBy": 2,
  "createdAtUtc": "2026-05-08T11:00:00Z"
}
```

---

### 4.3 Reject Application

```
POST http://localhost:5003/admin/applications/1/decision
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "decision": "REJECTED",
  "remarks": "Insufficient income documentation.",
  "approvedAmount": 0,
  "tenureMonths": 0,
  "interestRate": 0
}
```

**Response**
```json
{
  "id": 2,
  "applicationId": 1,
  "decision": "REJECTED",
  "remarks": "Insufficient income documentation.",
  "approvedAmount": 0,
  "tenureMonths": 0,
  "interestRate": 0,
  "createdBy": 2,
  "createdAtUtc": "2026-05-08T11:05:00Z"
}
```

---

### 4.4 Mark Under Review

```
POST http://localhost:5003/admin/applications/1/decision
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "decision": "UNDER_REVIEW",
  "remarks": "Awaiting additional salary slips.",
  "approvedAmount": 0,
  "tenureMonths": 0,
  "interestRate": 0
}
```

**Response**
```json
{
  "id": 3,
  "applicationId": 1,
  "decision": "UNDER_REVIEW",
  "remarks": "Awaiting additional salary slips.",
  "approvedAmount": 0,
  "tenureMonths": 0,
  "interestRate": 0,
  "createdBy": 2,
  "createdAtUtc": "2026-05-08T11:10:00Z"
}
```

---

### 4.5 Get Application History

```
GET http://localhost:5003/admin/applications/1/history
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  {
    "id": 1,
    "applicationId": 1,
    "oldStatus": "SUBMITTED",
    "newStatus": "APPROVED",
    "remarks": "All documents verified.",
    "changedBy": 2,
    "changedAtUtc": "2026-05-08T11:00:00Z"
  }
]
```

---

### 4.6 Verify Document (via Admin)

```
PUT http://localhost:5003/admin/documents/1/verify
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "status": "VERIFIED",
  "remarks": "PAN card is clear and valid."
}
```

**Status values**: `VERIFIED`, `REJECTED`

**Response**
```json
{
  "message": "Document verified."
}
```

---

### 4.7 Get Report Summary

```
GET http://localhost:5003/admin/reports/summary
Authorization: Bearer {{admin_token}}
```

**Response**
```json
{
  "totalApplications": 25,
  "approvedCount": 10,
  "rejectedCount": 5,
  "pendingCount": 6,
  "underReviewCount": 2,
  "submittedCount": 2,
  "approvedTotalAmount": 4500000,
  "averageRequestedAmount": 520000,
  "averageApprovedAmount": 450000,
  "approvalRate": 40.0,
  "rejectionRate": 20.0,
  "generatedAtUtc": "2026-05-08T11:30:00Z"
}
```

---

## 5. WALLET SERVICE — `http://localhost:5005`

---

### 5.1 Get Wallet Balance

```
GET http://localhost:5005/wallet
Authorization: Bearer {{token}}
```

**Response**
```json
{
  "userId": 1,
  "availableBalance": 1500.00,
  "pendingBalance": 0.00,
  "totalBalance": 1500.00
}
```

---

### 5.2 Create Razorpay Order (Top-up)

```
POST http://localhost:5005/wallet/razorpay/order
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "amount": 1000
}
```

**Response**
```json
{
  "orderId": "order_PQR123abc456",
  "amount": 1000,
  "currency": "INR",
  "keyId": "rzp_test_SkkpPMKZ1Z5Otj"
}
```

---

### 5.3 Verify Razorpay Payment & Credit Wallet

> Use the values returned by Razorpay checkout after payment.

```
POST http://localhost:5005/wallet/razorpay/verify
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "razorpayOrderId": "order_PQR123abc456",
  "razorpayPaymentId": "pay_XYZ789def012",
  "razorpaySignature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "amountInr": 1000
}
```

**Response**
```json
{
  "id": 1,
  "type": "CREDIT",
  "category": "RAZORPAY_TOPUP",
  "amount": 1000.00,
  "status": "SUCCESS",
  "referenceId": "pay_XYZ789def012",
  "note": "Razorpay top-up",
  "createdAt": "2026-05-08T10:30:00Z"
}
```

---

### 5.4 Deduct Application Fee

> Called internally by ApplicationService on submit. Can also be tested directly.

```
POST http://localhost:5005/wallet/deduct-fee
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "applicationId": 1
}
```

**Response**
```json
{
  "id": 2,
  "type": "DEBIT",
  "category": "APPLICATION_FEE",
  "amount": 500.00,
  "status": "SUCCESS",
  "referenceId": "APP-1",
  "note": "Application fee for #CF-0001",
  "createdAt": "2026-05-08T10:35:00Z"
}
```

---

### 5.5 Get Transaction History

```
GET http://localhost:5005/wallet/transactions
Authorization: Bearer {{token}}
```

**Response**
```json
[
  {
    "id": 1,
    "type": "CREDIT",
    "category": "RAZORPAY_TOPUP",
    "amount": 1000.00,
    "status": "SUCCESS",
    "referenceId": "pay_XYZ789def012",
    "note": "Razorpay top-up",
    "createdAt": "2026-05-08T10:30:00Z"
  },
  {
    "id": 2,
    "type": "DEBIT",
    "category": "APPLICATION_FEE",
    "amount": 500.00,
    "status": "SUCCESS",
    "referenceId": "APP-1",
    "note": "Application fee for #CF-0001",
    "createdAt": "2026-05-08T10:35:00Z"
  }
]
```

---

### 5.6 Request Withdrawal

```
POST http://localhost:5005/wallet/withdraw
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "amount": 500,
  "bankAccount": "50100123456789",
  "ifscCode": "HDFC0001234",
  "accountHolderName": "John Doe"
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500.00,
  "status": "PENDING",
  "bankAccount": "50100123456789",
  "ifscCode": "HDFC0001234",
  "accountHolderName": "John Doe",
  "adminNote": null,
  "createdAt": "2026-05-08T10:40:00Z"
}
```

---

### 5.7 Get My Withdrawals

```
GET http://localhost:5005/wallet/withdrawals
Authorization: Bearer {{token}}
```

**Response**
```json
[
  {
    "id": 1,
    "userId": 1,
    "amount": 500.00,
    "status": "PENDING",
    "bankAccount": "50100123456789",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "John Doe",
    "adminNote": null,
    "createdAt": "2026-05-08T10:40:00Z"
  }
]
```

---

### 5.8 Admin — Get Wallet Summary

```
GET http://localhost:5005/admin/wallet/summary
Authorization: Bearer {{admin_token}}
```

**Response**
```json
{
  "totalFeesCollected": 12500.00,
  "totalLoanDisbursed": 4500000.00,
  "totalPendingWithdrawals": 2500.00,
  "totalActiveWalletBalance": 85000.00,
  "pendingWithdrawalCount": 5,
  "totalTransactionCount": 142
}
```

---

### 5.9 Admin — Get All Transactions

```
GET http://localhost:5005/admin/wallet/transactions
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  {
    "id": 1,
    "type": "CREDIT",
    "category": "RAZORPAY_TOPUP",
    "amount": 1000.00,
    "status": "SUCCESS",
    "referenceId": "pay_XYZ789def012",
    "note": "Razorpay top-up",
    "createdAt": "2026-05-08T10:30:00Z"
  },
  {
    "id": 2,
    "type": "DEBIT",
    "category": "APPLICATION_FEE",
    "amount": 500.00,
    "status": "SUCCESS",
    "referenceId": "APP-1",
    "note": "Application fee for #CF-0001",
    "createdAt": "2026-05-08T10:35:00Z"
  }
]
```

---

### 5.10 Admin — Get All Withdrawals

```
GET http://localhost:5005/admin/wallet/withdrawals
Authorization: Bearer {{admin_token}}
```

**Response**
```json
[
  {
    "id": 1,
    "userId": 1,
    "amount": 500.00,
    "status": "PENDING",
    "bankAccount": "50100123456789",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "John Doe",
    "adminNote": null,
    "createdAt": "2026-05-08T10:40:00Z"
  }
]
```

---

### 5.11 Admin — Review Withdrawal (Approve)

```
POST http://localhost:5005/admin/wallet/withdrawals/1/review
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "approve": true,
  "note": "Verified bank details. Approved for disbursal."
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500.00,
  "status": "APPROVED",
  "bankAccount": "50100123456789",
  "ifscCode": "HDFC0001234",
  "accountHolderName": "John Doe",
  "adminNote": "Verified bank details. Approved for disbursal.",
  "createdAt": "2026-05-08T10:40:00Z"
}
```

---

### 5.12 Admin — Review Withdrawal (Reject)

```
POST http://localhost:5005/admin/wallet/withdrawals/1/review
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "approve": false,
  "note": "Invalid IFSC code provided."
}
```

**Response**
```json
{
  "id": 1,
  "userId": 1,
  "amount": 500.00,
  "status": "REJECTED",
  "bankAccount": "50100123456789",
  "ifscCode": "HDFC0001234",
  "accountHolderName": "John Doe",
  "adminNote": "Invalid IFSC code provided.",
  "createdAt": "2026-05-08T10:40:00Z"
}
```

---

### 5.13 Admin — Disburse Loan to Wallet

```
POST http://localhost:5005/admin/wallet/disburse
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "userId": 1,
  "amount": 450000,
  "applicationId": 1
}
```

**Response**
```json
{
  "id": 5,
  "type": "CREDIT",
  "category": "LOAN_DISBURSEMENT",
  "amount": 450000.00,
  "status": "SUCCESS",
  "referenceId": "LOAN-1",
  "note": "Loan disbursement for #CF-0001",
  "createdAt": "2026-05-08T12:00:00Z"
}
```

---

## 6. GATEWAY ROUTES — `http://localhost:5021`

All the above endpoints are also accessible via the API Gateway with the `/gateway` prefix.

| Direct | Via Gateway |
|---|---|
| `POST http://localhost:5000/auth/login` | `POST http://localhost:5021/gateway/auth/login` |
| `POST http://localhost:5001/applications` | `POST http://localhost:5021/gateway/applications` |
| `POST http://localhost:5002/documents/upload` | `POST http://localhost:5021/gateway/documents/upload` |
| `GET http://localhost:5003/admin/applications` | `GET http://localhost:5021/gateway/admin/applications` |
| `GET http://localhost:5005/wallet` | `GET http://localhost:5021/gateway/wallet` |
| `POST http://localhost:5001/chat/message` | `POST http://localhost:5021/gateway/chat/message` |

---

## 7. COMPLETE TESTING FLOW (Happy Path)

Follow this sequence to test the full loan lifecycle end-to-end:

```
Step 1  → POST /auth/signup/request-otp       (get OTP on email)
Step 2  → POST /auth/signup/verify-otp        (get verificationToken)
Step 3  → POST /auth/signup                   (get JWT token → save as {{token}})
Step 4  → PUT  /auth/profile                  (complete KYC profile)
Step 5  → POST /wallet/razorpay/order         (create top-up order)
Step 6  → POST /wallet/razorpay/verify        (credit wallet — use test payment)
Step 7  → POST /applications                  (create loan application)
Step 8  → POST /documents/upload              (upload PAN — form-data)
Step 9  → POST /documents/upload              (upload AADHAAR — form-data)
Step 10 → POST /applications/1/submit         (submit — deducts ₹500 fee)

--- Switch to Admin token ---

Step 11 → POST /auth/login                    (login as admin → save as {{admin_token}})
Step 12 → GET  /admin/applications            (view queue)
Step 13 → PUT  /admin/documents/1/verify      (verify PAN)
Step 14 → PUT  /admin/documents/2/verify      (verify AADHAAR)
Step 15 → POST /admin/applications/1/decision (APPROVED)
Step 16 → POST /admin/wallet/disburse         (credit loan amount to applicant wallet)

--- Back to Applicant token ---

Step 17 → GET  /wallet                        (check credited balance)
Step 18 → GET  /applications/1/timeline       (see full status history)
Step 19 → POST /wallet/withdraw               (request withdrawal)
```

---

## 8. POSTMAN ENVIRONMENT SETUP

Create a Postman Environment with these variables:

| Variable | Initial Value | Description |
|---|---|---|
| `base_auth` | `http://localhost:5000` | AuthService base URL |
| `base_app` | `http://localhost:5001` | ApplicationService base URL |
| `base_doc` | `http://localhost:5002` | DocumentService base URL |
| `base_admin` | `http://localhost:5003` | AdminService base URL |
| `base_wallet` | `http://localhost:5005` | WalletService base URL |
| `base_gateway` | `http://localhost:5021` | Gateway base URL |
| `token` | *(set after login)* | Applicant JWT token |
| `admin_token` | *(set after admin login)* | Admin JWT token |

**Auto-set token after login** — add this to the Login request's **Tests** tab in Postman:

```javascript
const res = pm.response.json();
if (res.token) {
    pm.environment.set("token", res.token);
}
```

---

## 9. COMMON ERROR RESPONSES

| Status | Meaning | Fix |
|---|---|---|
| `401 Unauthorized` | Missing or expired JWT | Re-login and update `{{token}}` |
| `403 Forbidden` | Wrong role (e.g. APPLICANT hitting ADMIN route) | Use admin account |
| `400 Bad Request` | Validation failed or invalid OTP | Check request body fields |
| `404 Not Found` | Resource doesn't exist or not owned by you | Check the ID |
| `503 Service Unavailable` | Downstream service unreachable | Ensure all services are running |

---

*CapFinLoan API Testing Guide — v2.0 — 2026-05-08*
