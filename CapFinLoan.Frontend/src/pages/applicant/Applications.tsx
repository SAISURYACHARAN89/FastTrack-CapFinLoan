import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

interface Application {
  id: number;
  amount: number;
  tenureMonths: number;
  status: string;
  createdAt: string;
  decisionReason: string | null;
  decidedAtUtc: string | null;
}

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;

const statusStyles: Record<string, string> = {
  PENDING:      'bg-surface-container-highest text-slate-400 border border-white/10',
  SUBMITTED:    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  UNDER_REVIEW: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  APPROVED:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  REJECTED:     'bg-red-500/10 text-red-400 border border-red-500/20',
};

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export function ApplicantApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await api.get('/applications/my');
        setApps(res.data);
      } catch (err) {
        console.error('Failed to fetch applications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const filteredApps = apps.filter(a => filter === 'ALL' || a.status === filter);

  return (
    <DashboardLayout>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-12 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">
            My Applications
          </h2>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">
            Welcome back, {user?.name.split(' ')[0]}. Here's your loan history.
          </p>
        </div>
        <Link
          to="/applications/new"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-bold text-sm shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Application
        </Link>
      </header>

      {/* ── Summary strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/5 p-6 shadow-xl">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Apps</p>
          <p className="text-3xl font-headline font-extrabold text-on-surface">{apps.length}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/5 p-6 shadow-xl">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Approved</p>
          <p className="text-3xl font-headline font-extrabold text-emerald-400">
            {apps.filter(a => a.status === 'APPROVED').length}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/5 p-6 shadow-xl">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Under Review</p>
          <p className="text-3xl font-headline font-extrabold text-amber-400">
            {apps.filter(a => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/5 p-6 shadow-xl">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Requested</p>
          <p className="text-3xl font-headline font-extrabold text-on-surface tabular-nums">
            {apps.length > 0
              ? `₹${(apps.reduce((s, a) => s + a.amount, 0) / 100000).toFixed(1)}L`
              : '—'}
          </p>
        </div>
      </div>

      {/* ── Table section ──────────────────────────────────────── */}
      <section className="rounded-2xl bg-surface-container-low border border-outline-variant/5 overflow-hidden shadow-2xl">
        {/* Section header + filter tabs */}
        <div className="px-8 py-6 flex flex-wrap justify-between items-center gap-4 border-b border-white/5">
          <h3 className="text-lg font-bold font-headline">All Applications</h3>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
                  filter === f
                    ? 'bg-surface-container-highest text-on-surface border-white/10'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {f === 'ALL' ? `All (${apps.length})` : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-outline/30 text-6xl mb-4">description</span>
            <p className="text-outline font-medium">
              {filter === 'ALL' ? "You haven't submitted any applications yet." : `No ${filter.replace('_', ' ')} applications.`}
            </p>
            {filter !== 'ALL' ? (
              <button onClick={() => setFilter('ALL')} className="mt-4 text-primary font-bold hover:underline text-sm">
                Clear filter
              </button>
            ) : (
              <Link to="/applications/new" className="mt-4 text-primary font-bold hover:underline text-sm">
                Start an application
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold bg-surface-container-lowest/50">
                  <th className="px-8 py-4">App ID</th>
                  <th className="px-8 py-4">Amount &amp; Tenure</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Submitted</th>
                  <th className="px-8 py-4">Decision</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 text-sm font-medium text-slate-400 font-mono">
                      #CF-{app.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black font-headline tabular-nums text-on-surface">
                          {formatINR(app.amount)}
                        </span>
                        <span className="text-xs text-slate-500">{app.tenureMonths} Months</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${statusStyles[app.status] ?? statusStyles['PENDING']}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                      {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 max-w-xs">
                      {app.decidedAtUtc ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">
                            {new Date(app.decidedAtUtc).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {app.decisionReason && (
                            <span className="text-[10px] text-slate-600 truncate max-w-[160px]" title={app.decisionReason}>
                              {app.decisionReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1"
                      >
                        View Details
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredApps.length > 0 && (
          <div className="px-8 py-4 border-t border-white/5 bg-surface-container-lowest/30">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Showing {filteredApps.length} of {apps.length} applications
            </p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
