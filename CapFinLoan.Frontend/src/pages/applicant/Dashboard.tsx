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
}

interface UserProfile {
  isProfileComplete: boolean;
}

export function ApplicantDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const [appsRes, profileRes] = await Promise.all([
          api.get('/applications/my'),
          api.get<UserProfile>('/auth/me')
        ]);
        setApps(appsRes.data);
        setProfileComplete(profileRes.data.isProfileComplete);
      } catch (err) {
        console.error("Failed to fetch apps", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const totalRequested = apps.reduce((sum, app) => sum + app.amount, 0);
  const approvedCount = apps.filter(a => a.status === 'APPROVED').length;
  const pendingCount = apps.filter(a => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length;
  
  // Format currency
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-surface-container-highest text-slate-400 border border-white/10',
      'SUBMITTED': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      'UNDER_REVIEW': 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      'APPROVED': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      'REJECTED': 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${styles[status] || styles['PENDING']}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">
            Good morning, {user?.name.split(' ')[0]}.
          </h2>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </header>

      {!profileComplete && (
        <section className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Finish Setup Required</p>
            <p className="text-sm text-amber-100/90 mt-1">Finish setting up your account to apply for loans.</p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 text-sm font-bold transition-colors"
          >
            Complete Profile
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </section>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* 1. Hero Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-surface-container-low p-8 border border-outline-variant/5 shadow-2xl">
          <div className="absolute bottom-0 right-0 w-full h-1/2 opacity-20 pointer-events-none overflow-hidden">
            <svg className="w-full h-full preserve-3d" viewBox="0 0 400 100">
              <path d="M0,80 Q50,20 100,50 T200,30 T300,70 T400,10" fill="none" stroke="#4f46e5" strokeLinecap="round" strokeWidth="3"></path>
              <path d="M0,80 Q50,20 100,50 T200,30 T300,70 T400,10 V100 H0 Z" fill="url(#grad1)" opacity="0.5"></path>
              <defs>
                <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }}></stop>
                  <stop offset="100%" style={{ stopColor: '#4f46e5', stopOpacity: 0 }}></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 block">Total Requested Capital</span>
            <h3 className="text-5xl lg:text-6xl font-black font-headline tabular-nums tracking-tighter text-on-surface">
              {formatINR(totalRequested)}
            </h3>
          </div>
        </div>

        {/* 2. Quick Action Card */}
        <Link to={profileComplete ? '/applications/new' : '/profile'} className="rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container p-1 shadow-xl group cursor-pointer transition-transform active:scale-95 duration-200">
          <div className="w-full h-full bg-surface-container-low/20 backdrop-blur-sm rounded-[14px] p-8 flex flex-col justify-between items-start">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
              <span className="material-symbols-outlined text-3xl">{profileComplete ? 'add' : 'person'}</span>
            </div>
            <div>
              <h4 className="text-xl font-bold font-headline leading-tight text-white mb-1">{profileComplete ? 'Start New Application' : 'Complete Profile'}</h4>
              <p className="text-white/60 text-xs font-medium">{profileComplete ? 'Instant proposal draft' : 'Required before applying'}</p>
            </div>
          </div>
        </Link>

        {/* 3. Status Breakdown Module */}
        <div className="rounded-2xl bg-surface-container-low p-8 border border-outline-variant/5 flex flex-col items-center justify-center gap-4 shadow-xl">
          <div className="w-full space-y-3 mt-2">
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Total Apps</span>
              <span className="text-on-surface font-bold">{apps.length}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Approved</span>
              <span className="text-emerald-400 font-bold">{approvedCount}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-slate-400">Pending Review</span>
              <span className="text-amber-400 font-bold">{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DataGrid Section */}
      <section className="rounded-2xl bg-surface-container-low border border-outline-variant/5 overflow-hidden shadow-2xl">
        <div className="px-8 py-6 flex justify-between items-center border-b border-white/5">
          <h3 className="text-lg font-bold font-headline">Recent Activity</h3>
          <Link to="/applications" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            View All Archive
          </Link>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : apps.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
             <span className="material-symbols-outlined text-outline/30 text-6xl mb-4">description</span>
             <p className="text-outline font-medium">You haven't submitted any applications yet.</p>
             <Link to="/applications/new" className="mt-4 text-primary font-bold hover:underline">Start an application</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold bg-surface-container-lowest/50">
                  <th className="px-8 py-4">App ID</th>
                  <th className="px-8 py-4">Amount & Tenure</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Created Date</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {apps.slice(0, 5).map(app => (
                  <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 text-sm font-medium text-slate-400">#CF-{app.id.toString().padStart(4, '0')}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black font-headline tabular-nums text-on-surface">{formatINR(app.amount)}</span>
                        <span className="text-xs text-slate-500">{app.tenureMonths} Months</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                      {new Date(app.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link to={`/applications/${app.id}`} className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
