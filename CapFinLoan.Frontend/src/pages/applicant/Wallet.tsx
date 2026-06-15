import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { walletApi, type WalletDto, type TransactionDto, type WithdrawalRequestDto } from '../../services/walletService';
import { motion, AnimatePresence } from 'framer-motion';

// ── Razorpay global type ──────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const CATEGORY_LABELS: Record<string, string> = {
  APPLICATION_FEE: 'Application Fee',
  LOAN_DISBURSEMENT: 'Loan Disbursement',
  WITHDRAWAL: 'Withdrawal',
  RAZORPAY_TOPUP: 'Added Money',
};

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ── Modal: Add Money ──────────────────────────────────────────────────────────

function AddMoneyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { setError('Enter a valid amount.'); return; }
    setLoading(true);
    setError('');

    try {
      // 1. Create order on backend
      const { data: order } = await walletApi.createRazorpayOrder(amt);

      // 2. Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
          document.body.appendChild(script);
        });
      }

      // setLoading false before opening modal — Razorpay takes over the UI
      setLoading(false);

      // 3. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: 'CapFinLoan',
          description: 'Wallet Top-up',
          order_id: order.orderId,
          theme: { color: '#6366f1' },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify on backend and credit wallet
              await walletApi.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amountInr: order.amount,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('DISMISSED')),
          },
        });
        rzp.open();
      });

      // Payment verified and wallet credited — refresh and close
      onSuccess();
      onClose();

    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'DISMISSED') {
        // User closed the modal — not an error, just stop loading
        return;
      }
      const msg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-surface-container-low rounded-3xl border border-white/10 shadow-2xl p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold text-on-surface">Add Money</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">Securely add money to your wallet via Razorpay.</p>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_AMOUNTS.map(q => (
            <button
              key={q}
              onClick={() => setAmount(q.toString())}
              className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                amount === q.toString()
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-surface-container border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              ₹{q}
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Enter amount (₹)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 outline-none text-sm mb-4"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-on-primary" />
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Pay with Razorpay
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// ── Modal: Withdraw ───────────────────────────────────────────────────────────

function WithdrawModal({
  availableBalance,
  onClose,
  onSuccess,
}: {
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ amount: '', bankAccount: '', ifscCode: '', accountHolderName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt < 100) { setError('Minimum withdrawal is ₹100.'); return; }
    if (amt > availableBalance) { setError('Amount exceeds available balance.'); return; }
    if (!form.bankAccount.trim() || !form.ifscCode.trim() || !form.accountHolderName.trim()) {
      setError('All bank details are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await walletApi.requestWithdrawal({
        amount: amt,
        bankAccount: form.bankAccount.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        accountHolderName: form.accountHolderName.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Withdrawal request failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-surface-container-low rounded-3xl border border-white/10 shadow-2xl p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold text-on-surface">Withdraw Money</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="bg-surface-container rounded-2xl p-4 mb-6 flex justify-between items-center">
          <span className="text-sm text-slate-400">Available Balance</span>
          <span className="text-lg font-black font-headline text-emerald-400">{formatINR(availableBalance)}</span>
        </div>

        <div className="space-y-3 mb-4">
          {[
            { key: 'amount', label: 'Amount (₹)', type: 'number', placeholder: 'e.g. 5000' },
            { key: 'accountHolderName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name as per bank' },
            { key: 'bankAccount', label: 'Bank Account Number', type: 'text', placeholder: 'e.g. 1234567890' },
            { key: 'ifscCode', label: 'IFSC Code', type: 'text', placeholder: 'e.g. SBIN0001234' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 outline-none text-sm"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-300" />
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              Submit Withdrawal Request
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// ── Main Wallet Page ──────────────────────────────────────────────────────────

type ActiveModal = 'add' | 'withdraw' | null;

export function ApplicantWallet() {
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'withdrawals'>('all');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestDto[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [walletRes, txRes, wdRes] = await Promise.all([
        walletApi.getWallet(),
        walletApi.getTransactions(),
        walletApi.getWithdrawals(),
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data);
      setWithdrawals(wdRes.data);
    } catch (err) {
      console.error('Failed to load wallet data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleModalSuccess = () => {
    setLoading(true);
    fetchAll();
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="mb-8 lg:mb-10">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-on-surface">
          My Wallet
        </h2>
        <p className="text-slate-500 mt-2 text-sm font-medium">Your money, all in one place.</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Balance + Actions Bento ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">

            {/* Available Balance — hero card */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 via-surface-container-low to-surface-container-low border border-indigo-500/20 p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 block mb-3">Available Balance</span>
                <div className="text-5xl lg:text-6xl font-black font-headline tabular-nums text-on-surface mb-2">
                  {formatINR(wallet?.availableBalance ?? 0)}
                </div>
                {(wallet?.pendingBalance ?? 0) > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm text-amber-400 font-medium">
                      {formatINR(wallet!.pendingBalance)} pending withdrawal
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setActiveModal('add')}
                className="flex-1 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all p-6 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-primary text-2xl">add_card</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-on-surface">Add Money</p>
                  <p className="text-xs text-slate-500">via Razorpay</p>
                </div>
              </button>

              <button
                onClick={() => setActiveModal('withdraw')}
                className="flex-1 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all p-6 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <span className="material-symbols-outlined text-amber-400 text-2xl">account_balance</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-on-surface">Withdraw</p>
                  <p className="text-xs text-slate-500">To bank account</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── Apply for Loan CTA ──────────────────────────────────────────── */}
          <div className="rounded-2xl bg-surface-container-low border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">currency_rupee</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Need a loan?</p>
                <p className="text-xs text-slate-500">₹500 application fee will be deducted from your wallet.</p>
              </div>
            </div>
            <a
              href="/applications/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
            >
              Apply for Loan
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>

          {/* ── Transaction History ─────────────────────────────────────────── */}
          <section className="rounded-2xl bg-surface-container-low border border-white/5 overflow-hidden shadow-xl">
            {/* Tabs */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-1">
              {(['all', 'withdrawals'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-on-surface hover:bg-white/5'
                  }`}
                >
                  {tab === 'all' ? 'All Transactions' : 'Withdrawals'}
                </button>
              ))}
            </div>

            {/* All Transactions */}
            {activeTab === 'all' && (
              transactions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">receipt_long</span>
                  <p className="text-slate-500 text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {transactions.map(tx => (
                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.type === 'CREDIT' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          <span className={`material-symbols-outlined text-[20px] ${
                            tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {tx.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{CATEGORY_LABELS[tx.category] ?? tx.category}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {tx.note && ` · ${tx.note}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-black tabular-nums ${
                          tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Withdrawals Tab */}
            {activeTab === 'withdrawals' && (
              withdrawals.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">account_balance</span>
                  <p className="text-slate-500 text-sm">No withdrawal requests yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {withdrawals.map(wd => (
                    <div key={wd.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-amber-400 text-[20px]">account_balance</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{formatINR(wd.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {wd.bankAccount} · {wd.ifscCode}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(wd.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[wd.status]}`}>
                          {wd.status}
                        </span>
                        {wd.adminNote && (
                          <p className="text-xs text-slate-500 max-w-[140px] text-right">{wd.adminNote}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'add' && (
          <AddMoneyModal onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />
        )}
        {activeModal === 'withdraw' && (
          <WithdrawModal
            availableBalance={wallet?.availableBalance ?? 0}
            onClose={() => setActiveModal(null)}
            onSuccess={handleModalSuccess}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
