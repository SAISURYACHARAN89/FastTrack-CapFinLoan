import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

interface ReportSummary {
  totalRequestedAmount: number;
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
}

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

export function AdminDashboard() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [queue, setQueue] = useState<Application[]>([]);
  const [identifiers, setIdentifiers] = useState<Record<number, UserIdentifier>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repRes, qRes] = await Promise.all([
          api.get('/admin/reports/summary'),
          api.get('/admin/applications')
        ]);
        setReport(repRes.data);
        setQueue(qRes.data);

        const userIds: number[] = [...new Set((qRes.data as Application[]).map(a => a.userId))];
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

  const formatINR = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const calculateApprovalRate = () => {
    if (!report || report.totalApplications === 0) return '0.0%';
    return `${((report.approvedCount / report.totalApplications) * 100).toFixed(1)}%`;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredQueue = queue.filter((app) => {
    if (!normalizedSearch) return true;

    const applicantName = (identifiers[app.userId]?.name || '').toLowerCase();
    const amountLabel = app.amount.toString();
    const appIdLabel = app.id.toString();
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
      <div className="flex justify-between items-center w-full mb-8">
        <div className="flex items-center gap-8 flex-1">
          <div className="relative w-full max-w-xl group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input
              className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-12 pr-16 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all font-body font-medium"
              placeholder="Search application IDs, names..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-surface-container-highest rounded border border-outline-variant/30 text-[10px] font-bold text-outline">⌘ K</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="h-8 w-px bg-white/5"></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* KPI Strip */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high/50 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Requested</span>
                <span className="material-symbols-outlined text-secondary opacity-50">payments</span>
              </div>
              <div className="text-3xl font-headline font-extrabold text-on-surface tabular-nums">
                {formatINR(report?.totalRequestedAmount || 0)}
              </div>
            </div>

            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high/50 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Approval Rate</span>
                <span className="material-symbols-outlined text-primary opacity-50">verified</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-headline font-extrabold text-on-surface tabular-nums">{calculateApprovalRate()}</span>
              </div>
            </div>

            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high/50 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Applications</span>
                <span className="material-symbols-outlined text-tertiary opacity-50">pending_actions</span>
              </div>
              <div className="text-3xl font-headline font-extrabold text-on-surface tabular-nums">
                {report?.totalApplications || 0}
              </div>
            </div>

            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high/50 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avg Review Time</span>
                <span className="material-symbols-outlined text-on-surface opacity-50">timer</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-headline font-extrabold text-on-surface tabular-nums">&lt; 1 Day</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-bold">OPTIMAL</span>
              </div>
            </div>
          </section>

          {/* Queue Data Grid */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-headline font-bold text-on-surface">Live Application Queue</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Live Updates</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-4">
                    <th className="pb-4 pl-6">Applicant</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500 text-sm font-medium">
                        {searchTerm.trim() ? 'No applications match your search.' : 'No applications in queue.'}
                      </td>
                    </tr>
                  ) : filteredQueue.map((app) => (
                    <tr key={app.id} className="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                      <td className="py-5 pl-6 rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center font-headline font-bold text-primary">
                            {(identifiers[app.userId]?.name?.charAt(0) || 'A').toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface">{identifiers[app.userId]?.name || `Applicant ${app.userId}`}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className="text-sm font-bold text-on-surface tabular-nums">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(app.amount)}</span>
                      </td>
                      <td className="py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                          app.status === 'UNDER_REVIEW' || app.status === 'SUBMITTED' ? 'bg-primary-container/20 text-primary-fixed-dim border-primary/20' :
                          app.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          app.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-surface-container-highest/20 text-slate-400 border-white/5'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-5 text-right pr-6 rounded-r-2xl">
                        <Link to={`/admin/applications/${app.id}`} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-on-surface inline-flex border border-white/0 hover:border-white/10 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
