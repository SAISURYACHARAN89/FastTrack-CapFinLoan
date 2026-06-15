import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatINR = (value: number, abbreviated = true) => {
    if (abbreviated) {
      if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
      if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    }
    return formatFullCurrency(value);
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
      const stamp = new Date().toLocaleString('en-IN');
      
      const sections = [
        ['CAPFINLOAN SYSTEM AUDIT REPORT'],
        [`Generated On: ${stamp}`],
        ['-------------------------------------------'],
        ['1. SUMMARY METRICS'],
        ['Metric', 'Value', 'Notes'],
        ['Total Applications Received', report.totalApplications, 'Cumulative across all statuses'],
        ['Applications Approved', report.approvedCount, `${((report.approvedCount/report.totalApplications)*100).toFixed(1)}% conversion`],
        ['Applications Rejected', report.rejectedCount, `${((report.rejectedCount/report.totalApplications)*100).toFixed(1)}% rate`],
        ['Applications in Pipeline', report.pendingCount + report.underReviewCount, 'Pending + Under Review'],
        [''],
        ['2. FINANCIAL EXPOSURE'],
        ['Category', 'Value (INR)', 'Description'],
        ['Total Requested Capital', report.totalRequestedAmount, 'Total principal across all apps'],
        ['Total Approved Capital', report.approvedTotalAmount, 'Allocated capital'],
        ['Average Ticket Size (Req)', report.averageRequestedAmount, 'Avg principal per applicant'],
        ['Average Ticket Size (Appr)', report.averageApprovedAmount, 'Avg principal for approved apps'],
        [''],
        ['3. DETAILED APPLICATION QUEUE'],
        ['Application ID', 'User ID', 'Principal Amount (INR)', 'Tenure (Months)', 'Current Status', 'Submission Date', 'Document Count'],
        ...queue.map((item) => [
          item.id,
          `UID-${item.userId}`,
          item.amount,
          item.tenureMonths,
          item.status.toUpperCase(),
          new Date(item.createdAt).toLocaleDateString('en-IN'),
          item.documentCount
        ]),
        [''],
        ['EOF - End of Report']
      ];

      const csv = sections
        .map((row) => row.map((cell) => escapeCsv(cell as string | number)).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filenameStamp = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.setAttribute('download', `CapFinLoan_Report_${filenameStamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!report || exporting) return;

    setExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString('en-IN');
      const filenameStamp = new Date().toISOString().slice(0, 10);
      const primaryColor: [number, number, number] = [15, 31, 57]; // CapFin Dark Blue
      const accentColor: [number, number, number] = [31, 61, 110]; // CapFin Mid Blue

      // Helper for Footer
      const addFooter = (pageDoc: jsPDF, pageNumber: number, totalPages: number) => {
        pageDoc.setFontSize(8);
        pageDoc.setTextColor(150);
        pageDoc.setDrawColor(230);
        pageDoc.line(14, 282, 196, 282);
        pageDoc.text('CapFinLoan Internal Audit Report - Confidential', 14, 287);
        pageDoc.text(`Page ${pageNumber} of ${totalPages}`, 196, 287, { align: 'right' });
      };

      // --- PAGE 1: EXECUTIVE SUMMARY ---
      // Brand Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('CapFinLoan', 14, 22);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Executive Financial & Operational Audit', 14, 30);
      doc.text(`Ref: CFL-AR-${filenameStamp.replace(/-/g, '')}`, 196, 22, { align: 'right' });
      doc.text(`Generated: ${timestamp}`, 196, 27, { align: 'right' });

      // Summary Section Title
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Operational Performance Overview', 14, 55);
      
      // Horizontal Line
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 58, 60, 58);

      autoTable(doc, {
        startY: 65,
        head: [['Key Performance Metric', 'Data Point', 'System Health']],
        body: [
          ['Total Applications Logged', report.totalApplications.toString(), 'Optimal'],
          ['Approval Conversion Rate', calculateApprovalRate(), report.approvalRatePercent > 50 ? 'Strong' : 'Nominal'],
          ['Rejection Threshold', calculateRejectionRate(), 'Standard'],
          ['Active Pipeline Volume', (report.pendingCount + report.underReviewCount).toString(), 'Stable'],
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor, fontSize: 11, cellPadding: 4 },
        bodyStyles: { fontSize: 10, cellPadding: 4 },
        alternateRowStyles: { fillColor: [245, 248, 255] }
      });

      // Financial Exposure Section
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('2. Capital Exposure & Ticket Size', 14, finalY + 20);
      doc.line(14, finalY + 23, 60, finalY + 23);

      autoTable(doc, {
        startY: finalY + 30,
        head: [['Asset Category', 'Value (INR)', 'Allocation %']],
        body: [
          ['Total Requested Capital', formatFullCurrency(report.totalRequestedAmount), '100%'],
          ['Total Approved Capital', formatFullCurrency(report.approvedTotalAmount), `${((report.approvedTotalAmount/report.totalRequestedAmount)*100).toFixed(1)}%`],
          ['Average Ticket Size (Gross)', formatFullCurrency(report.averageRequestedAmount), 'System Avg'],
          ['Average Ticket Size (Approved)', formatFullCurrency(report.averageApprovedAmount), 'Risk Adjusted'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110], fontSize: 11, cellPadding: 4 }, // Finance Teal
        bodyStyles: { fontSize: 10, cellPadding: 4 },
        styles: { lineColor: [230, 230, 230] }
      });

      addFooter(doc, 1, 2);

      // --- PAGE 2: DATA LEDGER ---
      doc.addPage();
      
      // Page Header (Simple)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('3. Detailed Application Ledger', 14, 30);
      doc.line(14, 33, 60, 33);

      autoTable(doc, {
        startY: 40,
        head: [['App ID', 'Entity ID', 'Principal', 'Tenure', 'Current Status', 'Submission']],
        body: queue.map(item => [
          item.id,
          `UID-${item.userId}`,
          formatFullCurrency(item.amount),
          `${item.tenureMonths}m`,
          item.status.toUpperCase(),
          new Date(item.createdAt).toLocaleDateString('en-IN')
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: primaryColor },
        columnStyles: {
          4: { fontStyle: 'bold' } // Emphasize Status
        }
      });

      addFooter(doc, 2, 2);

      doc.save(`CapFinLoan_Audit_${filenameStamp}.pdf`);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 h-full">
        <header className="flex flex-wrap justify-between items-end gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl">bar_chart</span>
              <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-on-surface tracking-tight">Analytics & Reports</h1>
            </div>
            <p className="text-slate-500 text-sm hidden sm:block">Real-time macro-level insights and system-wide metrics.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-surface-container-high rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white border border-white/5 hover:border-white/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExportReport}
              disabled={loading || !report || exporting}
              type="button"
              title="Download CSV"
            >
              <span className="material-symbols-outlined text-[16px]">csv</span>
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-container rounded-lg text-xs font-bold uppercase tracking-widest text-on-primary-fixed hover:opacity-90 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExportPdf}
              disabled={loading || !report || exporting}
              type="button"
              title="Download PDF"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span className="hidden sm:inline">PDF Report</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-20 flex-1 items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Stats (Top) */}
            <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
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
                  <div className="text-2xl font-headline font-black text-on-surface tabular-nums">{formatINR(report?.averageRequestedAmount || 0, false)}</div>
                  <span className="text-xs font-bold text-slate-500 mb-1">Per application</span>
                </div>
              </div>
            </div>

            {/* Amount band performance */}
            <div className="lg:col-span-8 bg-surface-container-lowest/80 p-5 sm:p-8 rounded-3xl border border-white/5 shadow-2xl min-h-[400px] flex flex-col relative overflow-hidden">
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

            <div className="lg:col-span-4 bg-surface-container-lowest/80 p-5 sm:p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col">
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
