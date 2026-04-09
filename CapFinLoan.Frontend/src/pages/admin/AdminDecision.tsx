import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';

interface Application {
  id: number;
  userId: number;
  amount: number;
  tenureMonths: number;
  status: string;
  decisionReason: string | null;
  decidedAtUtc: string | null;
  createdAt: string;
}

interface Document {
  id: number;
  applicationId: number;
  fileName: string;
  status: string;
  uploadedAt: string;
}

interface StatusHistory {
  id: number;
  oldStatus: string;
  newStatus: string;
  remarks: string | null;
  changedBy: number;
  changedAtUtc: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const cls =
    status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
    status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
    status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' :
    'bg-slate-500/15 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cls}`}>
      {status}
    </span>
  );
};

export function AdminDecision() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionMode, setDecisionMode] = useState('APPROVED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; contentType: string; fileName: string } | null>(null);

  const openPreview = async (doc: Document) => {
    try {
      const token = localStorage.getItem('capfinloan_token');
      const response = await fetch(
        `http://localhost:5021/gateway/documents/${doc.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch document');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewDoc({ url, contentType: blob.type, fileName: doc.fileName });
    } catch (err) {
      console.error('Document preview failed', err);
      alert('Could not load document. Please try again.');
    }
  };

  const closePreview = () => {
    if (previewDoc) URL.revokeObjectURL(previewDoc.url);
    setPreviewDoc(null);
  };

  const fetchDetails = async () => {
    try {
      const [appRes, docsRes, histRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/documents/application/${id}`),
        api.get(`/admin/applications/${id}/history`).catch(e => {
          console.warn('Failed fetching history', e);
          return { data: [] };
        }),
      ]);
      setApplication(appRes.data);
      setDocuments(docsRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const verifyDocument = async (docId: number, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.put(`/admin/documents/${docId}/verify`, { status });
      await fetchDetails();
    } catch (err) {
      console.error('Failed to verify document', err);
      alert('Failed to update document status');
    }
  };

  const submitDecision = async () => {
    if (!window.confirm(`Are you sure you want to mark this application as ${decisionMode}?`)) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/applications/${id}/decision`, {
        decision: decisionMode,
        remarks: notes || 'Admin decision applied.',
      });
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to save final decision');
      setSubmitting(false);
    }
  };

  const formatINR = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  const formatUtcToLocal = (value: string) => {
    // Some API timestamps come without 'Z'. Treat them as UTC before rendering local time.
    const normalized = value.endsWith('Z') ? value : `${value}Z`;
    return new Date(normalized).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Application...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <span className="material-symbols-outlined text-6xl text-slate-600">error_outline</span>
          <p className="text-slate-400 font-semibold">Application not found.</p>
          <Link to="/admin/dashboard" className="text-primary text-sm font-bold hover:underline">← Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Document Preview Modal ───────────────────────────────────────────── */
  const PreviewModal = () => {
    if (!previewDoc) return null;
    const isImg = previewDoc.contentType.startsWith('image/');
    const isPdf = previewDoc.contentType === 'application/pdf';
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={closePreview}
      >
        <div
          className="relative bg-surface-container-low rounded-3xl shadow-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-indigo-400 text-[22px]">description</span>
              <span className="text-sm font-bold text-on-surface truncate">{previewDoc.fileName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={previewDoc.url}
                download={previewDoc.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Download
              </a>
              <button
                onClick={closePreview}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-white/5"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-black/30 min-h-0 p-4">
            {isImg && (
              <img
                src={previewDoc.url}
                alt={previewDoc.fileName}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            )}
            {isPdf && (
              <iframe
                src={previewDoc.url}
                title={previewDoc.fileName}
                className="w-full h-full min-h-[70vh] rounded-xl"
              />
            )}
            {!isImg && !isPdf && (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-slate-600 text-6xl mb-4 block">draft</span>
                <p className="text-slate-400 text-sm font-medium mb-4">Preview not available for this file type.</p>
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary rounded-xl text-sm font-bold hover:bg-primary/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const isDecisionLocked = application.status === 'APPROVED' || application.status === 'REJECTED';

  return (
    <DashboardLayout>
      <PreviewModal />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              to="/admin/applications"
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back To Queue
            </Link>
            <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
              Application CF-{application.id.toString().padStart(4, '0')}
            </h1>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-surface-container-high/40 border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
                <h2 className="text-sm font-headline font-black uppercase tracking-widest text-on-surface">Decision</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Final Status</label>
                  <div className="relative">
                    <select
                      disabled={isDecisionLocked}
                      className="w-full bg-surface-container border border-white/5 rounded-xl text-sm font-bold text-on-surface focus:ring-2 focus:ring-secondary/50 appearance-none px-4 py-3 disabled:opacity-40 pr-10"
                      value={decisionMode}
                      onChange={e => setDecisionMode(e.target.value)}
                    >
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3 text-slate-500 pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Notes</label>
                  <textarea
                    disabled={isDecisionLocked}
                    className="w-full bg-surface-container border border-white/5 rounded-xl text-sm font-medium text-slate-300 focus:ring-2 focus:ring-primary/50 px-4 py-3 h-[52px] resize-none placeholder:text-outline-variant/60 disabled:opacity-40"
                    placeholder="Add decision notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  disabled={isDecisionLocked || submitting}
                  onClick={submitDecision}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-headline font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] duration-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Save Decision <span className="material-symbols-outlined text-[16px]">verified_user</span></>
                  )}
                </button>
                {isDecisionLocked && (
                  <p className="text-center text-[10px] text-secondary mt-3 font-black uppercase tracking-widest bg-secondary/10 py-2 rounded-lg border border-secondary/20">
                    Decision Locked
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low/40 border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-headline font-bold text-on-surface">Documents</h2>
                <span className="text-xs font-bold text-slate-500 bg-surface-container px-3 py-1 rounded-full border border-white/5">
                  {documents.length}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm font-medium">No documents uploaded.</div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => openPreview(doc)}
                      className="bg-surface-container-lowest/60 rounded-xl border border-white/5 hover:border-indigo-400/40 transition-all p-4 flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter border ${
                          doc.status === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                          doc.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                          'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {doc.status}
                        </span>

                        {!isDecisionLocked && doc.status === 'PENDING' && (
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => verifyDocument(doc.id, 'VERIFIED')}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-container hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors border border-white/5"
                              title="Verify"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </button>
                            <button
                              onClick={() => verifyDocument(doc.id, 'REJECTED')}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-container hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-white/5"
                              title="Reject"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface-container-low/40 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Timeline</h2>

              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm font-medium">No status history.</div>
              ) : (
                <div className="space-y-3">
                  {history.map(record => (
                    <div key={record.id} className="bg-surface-container-highest/40 rounded-xl p-4 border border-white/5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono">{record.oldStatus || 'INITIAL'}</span>
                          <span className="material-symbols-outlined text-[12px] text-primary">arrow_forward</span>
                          <StatusBadge status={record.newStatus} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatUtcToLocal(record.changedAtUtc)}
                        </span>
                      </div>
                      {record.remarks && (
                        <p className="text-xs text-slate-300 mt-2">
                          {record.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <div className="bg-surface-container-low/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-headline font-black uppercase tracking-widest text-on-surface">Summary</h2>

              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Requested Amount</p>
                <p className="text-3xl font-headline font-black text-secondary tabular-nums">{formatINR(application.amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tenure</p>
                  <p className="text-sm font-bold text-on-surface">{application.tenureMonths} mo</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Documents</p>
                  <p className="text-sm font-bold text-on-surface">{documents.length}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Submitted</p>
                  <p className="text-sm font-semibold text-on-surface">
                    {new Date(application.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {application.decisionReason && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Latest Decision Note</p>
                  <p className="text-xs text-slate-300">{application.decisionReason}</p>
                </div>
              )}

              {application.decidedAtUtc && (
                <div className="pt-3 border-t border-white/5 text-xs text-slate-400">
                  Finalized on {formatUtcToLocal(application.decidedAtUtc)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
