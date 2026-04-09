import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';

interface ReportSummary {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  underReviewCount: number;
  totalRequestedAmount: number;
  approvedTotalAmount: number;
  averageRequestedAmount: number;
  averageApprovedAmount: number;
  approvalRatePercent: number;
  rejectionRatePercent: number;
  generatedAtUtc: string;
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

export function AdminReports() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [queue, setQueue] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportRes, queueRes] = await Promise.all([
          api.get('/admin/reports/summary'),
          api.get('/admin/applications')
        ]);
        setReport(reportRes.data);
        setQueue(queueRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatINR = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const calculateApprovalRate = () => `${(report?.approvalRatePercent ?? 0).toFixed(1)}%`;
  const calculateRejectionRate = () => `${(report?.rejectionRatePercent ?? 0).toFixed(1)}%`;

  const statusBuckets = [
    { label: 'Pending', count: report?.pendingCount ?? 0, tone: 'bg-slate-400' },
    { label: 'Under Review', count: report?.underReviewCount ?? 0, tone: 'bg-cyan-400' },
    { label: 'Approved', count: report?.approvedCount ?? 0, tone: 'bg-emerald-400' },
    { label: 'Rejected', count: report?.rejectedCount ?? 0, tone: 'bg-red-400' }
  ];

  const amountBands = [
    { label: 'Under 2L', min: 0, max: 200000 },
    { label: '2L - 5L', min: 200000, max: 500000 },
    { label: '5L - 10L', min: 500000, max: 1000000 },
    { label: '10L+', min: 1000000, max: Number.POSITIVE_INFINITY }
  ];

  const amountBandData = amountBands.map((band) => {
    const items = queue.filter((item) => item.amount >= band.min && item.amount < band.max);
    const approved = items.filter((item) => item.status === 'APPROVED').length;
    const rejected = items.filter((item) => item.status === 'REJECTED').length;
    const pending = items.filter((item) => item.status !== 'APPROVED' && item.status !== 'REJECTED').length;
    const approvalRate = items.length === 0 ? 0 : (approved / items.length) * 100;
    return {
      ...band,
      total: items.length,
      approved,
      rejected,
      pending,
      approvalRate
    };
  });

  const maxBandCount = Math.max(1, ...amountBandData.map((x) => x.total));

  const escapeCsv = (value: string | number) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportReport = () => {
    if (!report || exporting) return;

    setExporting(true);
    try {
      const summaryRows = [
        ['Metric', 'Value'],
        ['Total Applications', report.totalApplications],
        ['Approved Count', report.approvedCount],
        ['Rejected Count', report.rejectedCount],
        ['Pending Count', report.pendingCount],
        ['Under Review Count', report.underReviewCount],
        ['Total Requested Amount', report.totalRequestedAmount],
        ['Approved Total Amount', report.approvedTotalAmount],
        ['Average Requested Amount', report.averageRequestedAmount],
        ['Average Approved Amount', report.averageApprovedAmount],
        ['Approval Rate Percent', report.approvalRatePercent],
        ['Rejection Rate Percent', report.rejectionRatePercent],
        ['Generated At (UTC)', report.generatedAtUtc]
      ];

      const queueRows = [
        [],
        ['Application Queue'],
        ['ApplicationId', 'UserId', 'Amount', 'TenureMonths', 'Status', 'CreatedAt', 'DocumentCount'],
        ...queue.map((item) => [
          item.id,
          item.userId,
          item.amount,
          item.tenureMonths,
          item.status,
          item.createdAt,
          item.documentCount
        ])
      ];

      const csv = [...summaryRows, ...queueRows]
        .map((row) => row.map((cell) => escapeCsv(cell as string | number)).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

      link.href = url;
      link.setAttribute('download', `capfinloan-admin-report-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 h-full">
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl">bar_chart</span>
              <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Analytics & Reports</h1>
            </div>
            <p className="text-slate-500 text-sm">Real-time macro-level insights and system-wide metrics.</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white border border-white/5 hover:border-white/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportReport}
            disabled={loading || !report || exporting}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span> Export Report
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center p-20 flex-1 items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Stats (Top) */}
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-surface-container to-surface-container-high p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Total Requested Capital</span>
                  <div className="text-4xl font-headline font-black text-primary tabular-nums">
                    {formatINR(report?.totalRequestedAmount || 0)}
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Approval Rate</span>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-headline font-black text-emerald-400 tabular-nums">{calculateApprovalRate()}</div>
                  <span className="text-xs font-bold text-slate-500 mb-1">/ {report?.approvedCount} Approved</span>
                </div>
              </div>

              <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Rejection Rate</span>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-headline font-black text-red-400 tabular-nums">{calculateRejectionRate()}</div>
                  <span className="text-xs font-bold text-slate-500 mb-1">/ {report?.rejectedCount} Rejected</span>
                </div>
              </div>

               <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Average Ticket Size</span>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-headline font-black text-on-surface tabular-nums">{formatINR(report?.averageRequestedAmount || 0)}</div>
                  <span className="text-xs font-bold text-slate-500 mb-1">Per application</span>
                </div>
              </div>
            </div>

            {/* Amount band performance */}
            <div className="lg:col-span-8 bg-surface-container-lowest/80 p-8 rounded-3xl border border-white/5 shadow-2xl min-h-[400px] flex flex-col relative overflow-hidden">
               <div className="mb-6">
                 <h3 className="text-lg font-headline font-bold text-on-surface tracking-wide">Loan Size Performance</h3>
                 <p className="text-xs text-slate-500">Application mix and approval conversion by amount band.</p>
               </div>

               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {amountBandData.map((band) => (
                   <div key={band.label} className="bg-surface-container-low/50 rounded-2xl p-5 border border-white/5">
                     <div className="flex items-center justify-between mb-3">
                       <h4 className="text-sm font-bold text-on-surface tracking-wide">{band.label}</h4>
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{band.total} apps</span>
                     </div>

                     <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-4">
                       <div
                         className="h-full bg-primary rounded-full"
                         style={{ width: `${(band.total / maxBandCount) * 100}%` }}
                       ></div>
                     </div>

                     <div className="grid grid-cols-3 gap-2 text-[11px] font-bold mb-3">
                       <div className="text-emerald-400">Approved: {band.approved}</div>
                       <div className="text-red-400">Rejected: {band.rejected}</div>
                       <div className="text-cyan-400">Open: {band.pending}</div>
                     </div>

                     <div className="text-xs text-slate-500">
                       Approval Conversion: <span className="text-on-surface font-semibold">{band.approvalRate.toFixed(1)}%</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="lg:col-span-4 bg-surface-container-lowest/80 p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col">
               <div className="mb-8">
                 <h3 className="text-lg font-headline font-bold text-on-surface tracking-wide">Pipeline Breakdown</h3>
                 <p className="text-xs text-slate-500">Current status distribution from live queue.</p>
               </div>

               <div className="flex-1 flex flex-col justify-center gap-6">
                 {statusBuckets.map((bucket, i) => {
                   const total = report?.totalApplications || 0;
                   const ratio = total === 0 ? 0 : (bucket.count / total) * 100;
                   return (
                     <div className="space-y-2" key={i}>
                       <div className="flex justify-between items-center text-xs font-bold">
                         <span className="text-slate-400">{bucket.label}</span>
                         <span className="text-on-surface tabular-nums">{bucket.count}</span>
                       </div>
                       <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                         <div className={`h-full ${bucket.tone} rounded-full`} style={{ width: `${ratio}%` }}></div>
                       </div>
                     </div>
                   );
                 })}

                 <div className="pt-4 border-t border-white/5 text-xs text-slate-500">
                   Generated {report ? new Date(report.generatedAtUtc).toLocaleString('en-IN') : '-'}
                 </div>
               </div>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
