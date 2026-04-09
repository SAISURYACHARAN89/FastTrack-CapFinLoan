import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

interface Application {
  id: number;
  userId: number;
  amount: number;
  tenureMonths: number;
  status: string;
  createdAt: string;
  documentCount: number;
}

interface UserIdentifier {
  userId: number;
  name: string;
  mobileNumber?: string;
  bankName?: string;
  employmentStatus?: string;
}

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  SUBMITTED:    { bg: 'bg-primary-container/20',  text: 'text-primary-fixed-dim', border: 'border-primary/20'       },
  UNDER_REVIEW: { bg: 'bg-yellow-500/10',          text: 'text-yellow-400',        border: 'border-yellow-500/20'   },
  APPROVED:     { bg: 'bg-emerald-500/10',         text: 'text-emerald-400',       border: 'border-emerald-500/20'  },
  REJECTED:     { bg: 'bg-red-500/10',             text: 'text-red-500',           border: 'border-red-500/20'      },
};

export function AdminApplications() {
  const [queue, setQueue] = useState<Application[]>([]);
  const [identifiers, setIdentifiers] = useState<Record<number, UserIdentifier>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/admin/applications');
        setQueue(res.data);

        const userIds: number[] = [...new Set((res.data as Application[]).map(a => a.userId))];
        if (userIds.length > 0) {
          const query = userIds.map(id => `ids=${id}`).join('&');
          const identifiersRes = await api.get<UserIdentifier[]>(`/auth/users/identifiers?${query}`);
          const mapped = identifiersRes.data.reduce<Record<number, UserIdentifier>>((acc, item) => {
            acc[item.userId] = item;
            return acc;
          }, {});
          setIdentifiers(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredQueue = queue.filter(app => {
    const statusMatch = filter === 'ALL' || app.status === filter;
    if (!statusMatch) return false;
    if (!normalizedSearch) return true;

    const applicantName = (identifiers[app.userId]?.name || '').toLowerCase();
    const appIdLabel = app.id.toString();
    const amountLabel = app.amount.toString();
    const statusLabel = app.status.toLowerCase();

    return (
      applicantName.includes(normalizedSearch) ||
      appIdLabel.includes(normalizedSearch) ||
      amountLabel.includes(normalizedSearch) ||
      statusLabel.includes(normalizedSearch)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-12">

        {/* ── Top bar  (matches Dashboard's search row style) ──*/}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-xl group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-12 pr-16 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all font-body font-medium"
                placeholder="Search by applicant name or application ref..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-surface-container-highest rounded border border-outline-variant/30 text-[10px] font-bold text-outline">⌘ K</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-8 w-px bg-white/5" />
          </div>
        </div>

        <div className="space-y-6">
          {/* ── KPI Strip ─────────────────────────────────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {(['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const).slice(1).map(f => {
              const count = queue.filter(a => a.status === f).length;
              const c = statusConfig[f];
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(isActive ? 'ALL' : f)}
                  className={`text-left bg-surface-container-low/40 backdrop-blur-xl border p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high/50 transition-all shadow-xl ${
                    isActive ? `${c.border} ring-1 ring-inset ${c.border}` : 'border-outline-variant/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{f.replace('_', ' ')}</span>
                  </div>
                  <div className={`text-3xl font-headline font-extrabold tabular-nums ${isActive ? c.text : 'text-on-surface'}`}>
                    {count}
                  </div>
                </button>
              );
            })}
          </section>

          {/* ── Filter Tabs ──────────────────────────────────── */}
          <div className="flex items-center justify-between gap-8 flex-wrap">
            <h3 className="text-xl font-headline font-bold text-on-surface">Application Queue</h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                    filter === f
                      ? 'bg-surface-container-highest text-on-surface border-white/10'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {f === 'ALL' ? `All (${queue.length})` : f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex justify-center p-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="pb-4 pl-6">Application</th>
                    <th className="pb-4">Tenure</th>
                    <th className="pb-4">Submitted</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <span className="material-symbols-outlined text-slate-700 text-5xl block mb-3">inbox</span>
                        <p className="text-slate-500 text-sm font-medium">No applications match the current filter.</p>
                        {(filter !== 'ALL' || searchTerm.trim()) && (
                          <button
                            onClick={() => {
                              setFilter('ALL');
                              setSearchTerm('');
                            }}
                            className="mt-3 text-xs text-primary font-bold hover:underline"
                          >
                            Clear filter
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : filteredQueue.map(app => {
                    const sc = statusConfig[app.status] ?? { bg: 'bg-surface-container-highest/20', text: 'text-slate-400', border: 'border-white/5' };
                    return (
                      <tr key={app.id} className="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                        {/* Applicant */}
                        <td className="py-5 pl-6 rounded-l-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                              <span className="font-headline font-bold text-sm">
                                {(identifiers[app.userId]?.name?.charAt(0) || 'A').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-on-surface">{identifiers[app.userId]?.name || `Applicant ${app.userId}`}</span>
                            </div>
                          </div>
                        </td>
                        {/* Tenure */}
                        <td className="py-5">
                          <span className="text-sm font-semibold text-slate-400">{app.tenureMonths} mo</span>
                        </td>
                        {/* Date */}
                        <td className="py-5">
                          <span className="text-sm text-slate-400">
                            {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {app.status}
                          </span>
                        </td>
                        {/* Action */}
                        <td className="py-5 text-right pr-6 rounded-r-2xl">
                          <Link
                            to={`/admin/applications/${app.id}`}
                            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-on-surface inline-flex items-center gap-1.5 border border-white/0 hover:border-white/10 transition-colors text-xs font-bold"
                          >
                            <span className="hidden sm:inline">Review</span>
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
