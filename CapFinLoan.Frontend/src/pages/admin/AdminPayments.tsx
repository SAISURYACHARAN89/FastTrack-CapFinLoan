import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { adminWalletApi, type AdminPaymentSummaryDto, type TransactionDto, type WithdrawalRequestDto } from '../../services/walletService';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatINR = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  withdrawal,
  onClose,
  onDone,
}: {
  withdrawal: WithdrawalRequestDto;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (approve: boolean) => {
    setLoading(true);
    setError('');
    try {
      await adminWalletApi.reviewWithdrawal(withdrawal.id, approve, note || undefined);
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
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
          <h2 className="text-xl font-headline font-bold text-on-surface">Review Withdrawal</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Details */}
        <div className="bg-surface-container rounded-2xl p-5 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">User ID</span>
            <span className="text-on-surface font-bold">#{withdrawal.userId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount</span>
            <span className="text-on-surface font-black text-base">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(withdrawal.amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Account</span>
            <span className="text-on-surface font-medium">{withdrawal.bankAccount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">IFSC</span>
            <span className="text-on-surface font-medium font-mono">{withdrawal.ifscCode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Holder</span>
            <span className="text-on-surface font-medium">{withdrawal.accountHolderName}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Admin Note (optional)</label>
          <textarea
            rows={2}
            placeholder="Reason for approval / rejection..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 outline-none text-sm resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handle(false)}
            disabled={loading}
            className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">cancel</span>
            Reject
          </button>
          <button
            onClick={() => handle(true)}
            disabled={loading}
            className="py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-400" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Approve
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Admin Payments Page ──────────────────────────────────────────────────

type Tab = 'fees' | 'disbursements' | 'withdrawals';

export function AdminPayments() {
  const [summary, setSummary] = useState<AdminPaymentSummaryDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('withdrawals');
  const [reviewTarget, setReviewTarget] = useState<WithdrawalRequestDto | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, txRes, wdRes] = await Promise.all([
        adminWalletApi.getSummary(),
        adminWalletApi.getAllTransactions(),
        adminWalletApi.getAllWithdrawals(),
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
      setWithdrawals(wdRes.data);
    } catch (err) {
      console.error('Failed to load admin payment data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fees = transactions.filter(t => t.category === 'APPLICATION_FEE' && t.status === 'SUCCESS');
  const disbursements = transactions.filter(t => t.category === 'LOAN_DISBURSEMENT' && t.status === 'SUCCESS');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');

  const KPI_CARDS = [
    {
      label: 'Fees Collected',
      value: formatINR(summary?.totalFeesCollected ?? 0),
      icon: 'receipt',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      sub: `${fees.length} transactions`,
    },
    {
      label: 'Loans Disbursed',
      value: formatINR(summary?.totalLoanDisbursed ?? 0),
      icon: 'currency_rupee',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      sub: `${disbursements.length} disbursements`,
    },
    {
      label: 'Pending Withdrawals',
      value: formatINR(summary?.totalPendingWithdrawals ?? 0),
      icon: 'pending',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      sub: `${summary?.pendingWithdrawalCount ?? 0} requests`,
    },
    {
      label: 'Total Wallet Balance',
      value: formatINR(summary?.totalActiveWalletBalance ?? 0),
      icon: 'account_balance_wallet',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      sub: 'System-wide',
    },
  ];

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'withdrawals', label: 'Withdrawals', count: pendingWithdrawals.length },
    { key: 'fees', label: 'Application Fees' },
    { key: 'disbursements', label: 'Loan Disbursements' },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="mb-8 lg:mb-10 flex flex-wrap justify-between items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
            <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-on-surface tracking-tight">
              Payments Control Panel
            </h1>
          </div>
          <p className="text-slate-500 text-sm">System-wide financial overview and withdrawal management.</p>
        </div>
        {(summary?.pendingWithdrawalCount ?? 0) > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-sm font-bold">
              {summary!.pendingWithdrawalCount} withdrawal{summary!.pendingWithdrawalCount > 1 ? 's' : ''} need review
            </span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── KPI Strip ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {KPI_CARDS.map(card => (
              <div
                key={card.label}
                className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-6 rounded-2xl flex flex-col justify-between hover:bg-surface-container-high/50 transition-all shadow-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[20px] ${card.color}`}>{card.icon}</span>
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-headline font-extrabold text-on-surface tabular-nums">
                  {card.value}
                </div>
                <p className="text-xs text-slate-500 mt-2">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────────── */}
          <section className="rounded-2xl bg-surface-container-low border border-white/5 overflow-hidden shadow-xl">
            {/* Tab bar */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-on-surface hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Withdrawals Tab ─────────────────────────────────────────── */}
            {activeTab === 'withdrawals' && (
              withdrawals.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">account_balance</span>
                  <p className="text-slate-500 text-sm">No withdrawal requests.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold bg-surface-container-lowest/50">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 hidden md:table-cell">Bank Account</th>
                        <th className="px-6 py-4 hidden lg:table-cell">Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {withdrawals.map(wd => (
                        <tr key={wd.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-primary text-sm">
                                {wd.userId}
                              </div>
                              <span className="text-sm text-slate-400 font-mono">UID-{wd.userId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-on-surface tabular-nums">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(wd.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-sm text-on-surface font-medium">{wd.bankAccount}</span>
                              <span className="text-xs text-slate-500 font-mono">{wd.ifscCode}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-slate-500">
                            {new Date(wd.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[wd.status]}`}>
                              {wd.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {wd.status === 'PENDING' ? (
                              <button
                                onClick={() => setReviewTarget(wd)}
                                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                              >
                                Review
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600 italic">{wd.adminNote || '—'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Application Fees Tab ────────────────────────────────────── */}
            {activeTab === 'fees' && (
              fees.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">receipt</span>
                  <p className="text-slate-500 text-sm">No application fees collected yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold bg-surface-container-lowest/50">
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fees.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-400 font-mono">UID-{tx.id}</td>
                          <td className="px-6 py-4 text-sm font-black text-on-surface tabular-nums">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400 font-mono">{tx.referenceId ?? '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[tx.status]}`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Loan Disbursements Tab ──────────────────────────────────── */}
            {activeTab === 'disbursements' && (
              disbursements.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">currency_rupee</span>
                  <p className="text-slate-500 text-sm">No loan disbursements yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold bg-surface-container-lowest/50">
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Amount Credited</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {disbursements.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-400 font-mono">UID-{tx.id}</td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-400 tabular-nums">
                            +{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400 font-mono">{tx.referenceId ?? '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[tx.status]}`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewTarget && (
          <ReviewModal
            withdrawal={reviewTarget}
            onClose={() => setReviewTarget(null)}
            onDone={() => { setLoading(true); fetchAll(); }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
