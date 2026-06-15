import api from '../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WalletDto {
  userId: number;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
}

export interface TransactionDto {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  category: 'APPLICATION_FEE' | 'LOAN_DISBURSEMENT' | 'WITHDRAWAL' | 'RAZORPAY_TOPUP';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface WithdrawalRequestDto {
  id: number;
  userId: number;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankAccount: string | null;
  ifscCode: string | null;
  accountHolderName: string | null;
  adminNote: string | null;
  createdAt: string;
}

export interface AdminPaymentSummaryDto {
  totalFeesCollected: number;
  totalLoanDisbursed: number;
  totalPendingWithdrawals: number;
  totalActiveWalletBalance: number;
  pendingWithdrawalCount: number;
  totalTransactionCount: number;
}

export interface RazorpayOrderDto {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyRazorpayPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  /** Original order amount in INR — avoids re-fetching from Razorpay */
  amountInr: number;
}

// ── User Wallet API ───────────────────────────────────────────────────────────

export const walletApi = {
  getWallet: () => api.get<WalletDto>('/wallet'),

  createRazorpayOrder: (amount: number) =>
    api.post<RazorpayOrderDto>('/wallet/razorpay/order', { amount }),

  verifyRazorpayPayment: (data: VerifyRazorpayPaymentRequest) =>
    api.post<TransactionDto>('/wallet/razorpay/verify', data),

  deductApplicationFee: (applicationId: number) =>
    api.post<TransactionDto>('/wallet/deduct-fee', { applicationId }),

  getTransactions: () => api.get<TransactionDto[]>('/wallet/transactions'),

  requestWithdrawal: (data: {
    amount: number;
    bankAccount: string;
    ifscCode: string;
    accountHolderName: string;
  }) => api.post<WithdrawalRequestDto>('/wallet/withdraw', data),

  getWithdrawals: () => api.get<WithdrawalRequestDto[]>('/wallet/withdrawals'),
};

// ── Admin Wallet API ──────────────────────────────────────────────────────────

export const adminWalletApi = {
  getSummary: () => api.get<AdminPaymentSummaryDto>('/admin/wallet/summary'),

  getAllTransactions: () => api.get<TransactionDto[]>('/admin/wallet/transactions'),

  getAllWithdrawals: () => api.get<WithdrawalRequestDto[]>('/admin/wallet/withdrawals'),

  reviewWithdrawal: (id: number, approve: boolean, note?: string) =>
    api.post<WithdrawalRequestDto>(`/admin/wallet/withdrawals/${id}/review`, { approve, note }),

  disburse: (userId: number, amount: number, applicationId: number) =>
    api.post<TransactionDto>('/admin/wallet/disburse', { userId, amount, applicationId }),
};
