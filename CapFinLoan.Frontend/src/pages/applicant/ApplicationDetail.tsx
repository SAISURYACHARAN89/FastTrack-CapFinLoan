import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';

interface Application {
  id: number;
  amount: number;
  tenureMonths: number;
  status: string;
  createdAt: string;
}

interface Document {
  id: number;
  documentType?: string;
  blobFileName: string;
  status: string;
  uploadedAt: string;
  fileName?: string;
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use refs to avoid stale state in onChange handler
  const selectedDocTypeRef = useRef<string>('');
  const editingDocIdRef = useRef<number | null>(null);

  const fetchDetails = async () => {
    try {
      const [appRes, docsRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/documents/application/${id}`)
      ]);
      setApplication(appRes.data);
      setDocuments(docsRes.data);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const docType = selectedDocTypeRef.current;
    const docId = editingDocIdRef.current;
    
    if (!file || !docType) {
      console.warn(`Upload cancelled: No file or doc type selected. File: ${file?.name}, DocType: ${docType}`);
      return;
    }

    console.log(`Starting upload for ${docType}, editing doc ID: ${docId}`);
    setUploadingType(docType);
    
    try {
      // If editing existing document, delete it first
      if (docId) {
        console.log(`Deleting existing document ID: ${docId}`);
        await api.delete(`/documents/${docId}`);
        console.log(`Successfully deleted document ID: ${docId}`);
      }

      // Now upload the new document
      const formData = new FormData();
      formData.append('ApplicationId', id as string);
      formData.append('DocumentType', docType);
      formData.append('File', file);

      console.log(`Uploading new document for type: ${docType}`);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log(`Successfully uploaded ${docType}`);
      
      await fetchDetails(); // Refresh list
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload document.');
    } finally {
      setUploadingType(null);
      selectedDocTypeRef.current = '';
      editingDocIdRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: number, docType: string) => {
    if (!window.confirm(`Delete ${docType || 'this'} document? You can upload a new one.`)) return;
    
    try {
      console.log(`Deleting document: ${docType} (ID: ${docId})`);
      await api.delete(`/documents/${docId}`);
      console.log(`Successfully deleted document ID: ${docId}`);
      await fetchDetails(); // Refresh list
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document.');
    }
  };

  const handleEditDocument = (docId: number, docType: string | undefined) => {
    // Use provided docType or infer from document
    const type = docType || 'DOCUMENT';
    console.log(`Edit button clicked: ${type} (ID: ${docId})`);
    
    // Set refs synchronously before triggering file input
    editingDocIdRef.current = docId;
    selectedDocTypeRef.current = type;
    
    console.log('Triggering file input click...');
    // Use setTimeout to ensure refs are set before triggering click
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const triggerFileInput = (docType: string) => {
    console.log(`Upload zone clicked for: ${docType}`);
    
    // Set refs synchronously
    editingDocIdRef.current = null;
    selectedDocTypeRef.current = docType;
    
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleSubmitApplication = async () => {
    if (!window.confirm("Are you sure you want to submit this application for review?")) return;
    
    setSubmitting(true);
    try {
      await api.post(`/applications/${id}/submit`);
      await fetchDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !application) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const interestRate = 11.45;
  const monthlyRate = interestRate / 100 / 12;
  const emi = (application.amount * monthlyRate * Math.pow(1 + monthlyRate, application.tenureMonths)) / (Math.pow(1 + monthlyRate, application.tenureMonths) - 1);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  // Helper to infer document type from filename
  const inferDocumentType = (doc: Document): string => {
    if (doc.documentType && doc.documentType !== '') return doc.documentType;
    const fileName = doc.fileName || doc.blobFileName || '';
    if (fileName.toUpperCase().includes('PAN')) return 'PAN';
    if (fileName.toUpperCase().includes('ITR') || fileName.toUpperCase().includes('TAX')) return 'ITR';
    if (fileName.toUpperCase().includes('BANK')) return 'BANK_STATEMENT';
    return 'DOCUMENT';
  };

  const hasPan = documents.some(d => {
    const type = inferDocumentType(d);
    return type === 'PAN';
  });
  const hasTax = documents.some(d => {
    const type = inferDocumentType(d);
    return type === 'ITR';
  });

  const canEditAndResubmit = ['PENDING', 'REJECTED'].includes(application.status);

  return (
    <DashboardLayout>
      <header className="sticky top-0 z-30 bg-surface/60 backdrop-blur-xl flex justify-between items-center px-4 py-6 w-full mb-8">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-xs font-medium tracking-wide">
            <Link to="/applications" className="text-slate-500 hover:text-indigo-400">Applications</Link>
            <span className="material-symbols-outlined text-[14px] mx-2 text-slate-600">chevron_right</span>
            <span className="text-indigo-400 font-bold">#CF-{application.id.toString().padStart(4, '0')}</span>
          </nav>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-12">
        {/* Left Column (60%) */}
        <div className="lg:col-span-6 space-y-12">
          {/* Hero Section */}
          <section className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500">Requested Capital</p>
            <div className="flex flex-col md:flex-row md:items-end gap-2">
              <h2 className="text-6xl md:text-7xl font-headline font-extrabold tabular-nums text-on-surface tracking-tighter">
                {formatINR(application.amount)}
              </h2>
              <span className="text-indigo-400 font-bold text-xl mb-3">INR</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-8">
              <span className="px-4 py-2 rounded-full bg-surface-container-high text-xs font-bold border border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-sm">payments</span>
                Working Capital
              </span>
              <span className="px-4 py-2 rounded-full bg-surface-container-high text-xs font-bold border border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-sm">calendar_month</span>
                {application.tenureMonths} Months
              </span>
            </div>
          </section>

          {/* Status Stepper */}
          <section className="bg-surface-container-low rounded-3xl p-10 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
            <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Application Progress</h3>
            
            <div className="space-y-12 relative">
              {/* Vertical Line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-surface-container-highest"></div>
              
              {/* Animated Progress Fill (Calculated based on status) */}
              <div className={`absolute left-[15px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-1000 ${
                application.status === 'PENDING' ? 'h-[0%]' : 
                application.status === 'SUBMITTED' ? 'h-[20%]' : 
                application.status === 'UNDER_REVIEW' ? 'h-[60%]' : 
                ['APPROVED', 'REJECTED'].includes(application.status) ? 'h-[100%]' : 'h-0'
              }`}></div>

              {/* Step: Created */}
              <div className="flex gap-8 relative z-10">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-indigo-500/10">
                  <span className="material-symbols-outlined text-white text-sm font-bold">check</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-on-surface">Application Created</h4>
                  <p className="text-xs text-slate-500 mt-1">Draft initiated on {new Date(application.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Step: Submitted */}
              <div className={`flex gap-8 relative z-10 ${application.status === 'PENDING' ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${application.status !== 'PENDING' ? 'bg-indigo-500' : 'bg-surface-container-highest'} ring-8 ring-indigo-500/10`}>
                  <span className="material-symbols-outlined text-white text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {application.status !== 'PENDING' ? 'check' : 'sync'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-on-surface">Submitted</h4>
                  <p className="text-xs text-slate-500 mt-1">Sent to CapFinLoan for review.</p>
                </div>
              </div>

              {/* Step: Under Review */}
              <div className={`flex gap-8 relative z-10 ${['PENDING', 'SUBMITTED'].includes(application.status) ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(application.status) ? 'bg-cyan-500' : 'bg-surface-container-highest'} ring-8 ring-cyan-500/10`}>
                  <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {application.status === 'UNDER_REVIEW' ? 'sync' : 'check'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-headline font-bold text-on-surface">Under Review</h4>
                    {application.status === 'UNDER_REVIEW' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-black uppercase tracking-tighter animate-pulse">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Lender is currently verifying your documents</p>
                </div>
              </div>

              {/* Step: Decision */}
              <div className={`flex gap-8 relative z-10 ${!['APPROVED', 'REJECTED'].includes(application.status) ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${application.status === 'APPROVED' ? 'bg-emerald-500' : application.status === 'REJECTED' ? 'bg-red-500' : 'bg-surface-container-highest'} ring-8 ring-indigo-500/10`}>
                  <span className="material-symbols-outlined text-white text-sm">
                    {application.status === 'APPROVED' ? 'verified' : application.status === 'REJECTED' ? 'cancel' : 'lock'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-on-surface">Decision Complete</h4>
                  <p className="text-xs text-slate-500 mt-1">Final decision: <strong>{application.status}</strong></p>
                </div>
              </div>
            </div>
          </section>

          {/* Breakdown Bento */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-high p-8 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Interest Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-black tabular-nums">{interestRate}</span>
                <span className="text-indigo-400 font-bold">% p.a.</span>
              </div>
              <div className="mt-6 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-1/3"></div>
              </div>
            </div>
            
            <div className="bg-surface-container-high p-8 rounded-3xl border border-white/5 group hover:border-cyan-500/30 transition-all">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Estimated EMI</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-black tabular-nums">{formatINR(emi)}</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-6 italic">Subject to final risk assessment</p>
            </div>
          </section>
        </div>

        {/* Right Column (40%) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low rounded-3xl p-8 border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-headline font-extrabold tracking-tight">Document Vault</h3>
              <span className="material-symbols-outlined text-indigo-400">shield</span>
            </div>

            {/* Uploaded List */}
            {documents.length > 0 && (
              <div className="space-y-4 mb-10">
                {documents.map(doc => {
                  const docType = inferDocumentType(doc);
                  return (
                    <div key={doc.id} className="bg-surface-container-highest/40 p-5 rounded-2xl flex items-center gap-4 group hover:bg-surface-container-highest transition-all border border-white/5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <span className="material-symbols-outlined">{docType === 'PAN' ? 'badge' : 'description'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{doc.fileName || doc.blobFileName || docType}</p>
                        <p className="text-[10px] text-slate-500">{docType} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
                        doc.status === 'VERIFIED' ? 'bg-secondary-container/10 text-secondary' :
                        doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {doc.status}
                      </span>
                      {/* Edit and Delete buttons - show only if editable */}
                      {canEditAndResubmit && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditDocument(doc.id, docType)}
                            className="p-2 rounded-lg hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition-all"
                            title="Edit/Update document"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id, docType)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                            title="Delete document"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rework notice */}
            {application.status === 'REJECTED' && (
              <div className="mb-6 p-4 rounded-xl border border-amber-400/20 bg-amber-500/10">
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">Changes Required</p>
                <p className="text-xs text-amber-100/80 mt-1">Update your documents and resubmit for review.</p>
              </div>
            )}

            {/* Dropzones (Only if editable) */}
            {canEditAndResubmit && (
              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2">
                  {documents.length > 0 ? 'Add or Update Documents' : 'Upload Required Documents'}
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg"
                />

                {/* PAN Upload Zone - Only show if not uploaded */}
                {!hasPan && (
                  <div 
                    onClick={() => triggerFileInput('PAN')}
                    className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingType === 'PAN' ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mb-2"></div>
                      ) : (
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-indigo-400 mb-2">upload_file</span>
                      )}
                      <p className="text-sm font-bold">{uploadingType === 'PAN' ? 'Uploading...' : 'Upload PAN Card'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">PDF, JPG up to 5MB</p>
                    </div>
                  </div>
                )}

                {/* ITR Upload Zone - Only show if not uploaded */}
                {!hasTax && (
                  <div 
                    onClick={() => triggerFileInput('ITR')}
                    className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingType === 'ITR' ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-secondary mb-2"></div>
                      ) : (
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-secondary mb-2">cloud_upload</span>
                      )}
                      <p className="text-sm font-bold">{uploadingType === 'ITR' ? 'Uploading...' : 'Upload IT Returns'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Past 3 fiscal years</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Final Action */}
            {canEditAndResubmit && (
              <button 
                onClick={handleSubmitApplication}
                disabled={submitting || documents.length === 0}
                className="w-full mt-10 py-4 bg-gradient-to-r from-primary-container to-secondary-container rounded-xl font-bold text-on-primary-fixed shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting...' : application.status === 'REJECTED' ? 'Resubmit Application' : 'Submit Application'}
                {!submitting && <span className="material-symbols-outlined text-sm">send</span>}
              </button>
            )}
            
          </div>

          {/* Side Note */}
          <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-indigo-400">info</span>
              <div>
                <p className="text-xs font-bold text-on-surface">Need Help?</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Your account manager is available for a call if you have questions regarding the verification process.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
