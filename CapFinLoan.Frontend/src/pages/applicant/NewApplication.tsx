import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';

interface UserProfile {
  isProfileComplete: boolean;
}

export function NewApplication() {
  const [amount, setAmount] = useState(2500000);
  const [tenure, setTenure] = useState(36);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<UserProfile>('/auth/me');
        setProfileComplete(res.data.isProfileComplete);
      } catch (err) {
        console.error(err);
        setError('Unable to verify profile setup. Please refresh.');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Dynamic Interest Calculation
  const interestRate = 11.25; // 11.25% p.a.
  const monthlyRate = interestRate / 100 / 12;
  const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const handleCreateDraft = async () => {
    if (!profileComplete) {
      setError('Finish setting up your profile before creating an application.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/applications', {
        amount,
        tenureMonths: tenure
      });
      // The backend returns an Application with 'id'
      navigate(`/applications/${response.data.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create application draft.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col relative overflow-hidden h-full">
        {/* Background Ambient Glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        {/* Header Content */}
        <header className="w-full pb-12 pt-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container/20 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/20">New Application</span>
            <h2 className="text-5xl font-extrabold font-headline tracking-tighter text-on-surface">Configure Your Capital</h2>
            <p className="text-on-surface-variant font-body text-lg max-w-xl mx-auto opacity-80">Precision engineering for your next financial milestone. Tailor your liquidity with our premium loan engine.</p>
          </div>
        </header>

        {/* Configuration Engine */}
        <section className="flex-1 w-full pb-20 relative z-10">
          <div className="max-w-2xl mx-auto space-y-12">
            
            {error && (
              <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium text-center">
                {error}
              </div>
            )}

            {!profileLoading && !profileComplete && (
              <div className="bg-amber-500/10 text-amber-200 border border-amber-400/20 rounded-xl p-5 text-sm font-medium text-center">
                <p className="font-bold uppercase tracking-wider text-[11px]">Finish Setup Required</p>
                <p className="mt-2">Complete your profile to continue with loan applications.</p>
                <Link to="/profile" className="inline-flex mt-3 px-4 py-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 transition-colors font-bold text-xs uppercase tracking-wider">
                  Go To Profile
                </Link>
              </div>
            )}

            {/* Loan Amount Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <label className="text-sm font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Loan Amount</label>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-headline tabular-nums text-on-surface">{formatINR(amount)}</span>
                </div>
              </div>
              <div className="relative pt-4 pb-2">
                <input 
                  className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(195,192,255,0.4)]" 
                  max="10000000" 
                  min="500000" 
                  step="50000" 
                  type="range" 
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <div className="flex justify-between mt-4 text-[10px] font-bold text-outline uppercase tracking-wider">
                  <span>5 Lakhs</span>
                  <span>1 Crore</span>
                </div>
              </div>
            </div>

            {/* Tenure Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <label className="text-sm font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Tenure</label>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-headline tabular-nums text-on-surface">{tenure}</span>
                  <span className="text-on-surface-variant text-sm">Months</span>
                </div>
              </div>
              <div className="relative pt-4 pb-2">
                <input 
                  className="w-full h-1 bg-surface-container-highest appearance-none cursor-pointer accent-secondary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(76,215,246,0.4)]" 
                  max="60" 
                  min="12" 
                  step="6" 
                  type="range" 
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                />
                <div className="flex justify-between mt-4 text-[10px] font-bold text-outline uppercase tracking-wider">
                  <span>1 Year</span>
                  <span>5 Years</span>
                </div>
              </div>
            </div>

            {/* Real-time Estimation Floating Card */}
            <div className="bg-surface-container-high/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between relative group hover:bg-surface-container-high/60 transition-all duration-500 gap-6 md:gap-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="material-symbols-outlined text-on-primary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Estimated Monthly Payment</p>
                  <h3 className="text-3xl font-extrabold font-headline tabular-nums text-secondary">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(emi)}
                  </h3>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Interest Rate</p>
                <p className="text-lg font-bold text-on-surface tabular-nums">{interestRate}% <span className="text-[10px] font-normal opacity-50">p.a.</span></p>
              </div>
            </div>

            {/* Detail Bento Mini Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary mb-3">verified_user</span>
                <h4 className="text-xs font-bold text-on-surface mb-1">Instant Approval</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">Priority processing for Tier 1 members. Funds dispersed within 24 business hours.</p>
              </div>
              <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10">
                <span className="material-symbols-outlined text-secondary mb-3">lock_reset</span>
                <h4 className="text-xs font-bold text-on-surface mb-1">Flexible Repayment</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">No prepayment penalties after the first 6 months of the tenure period.</p>
              </div>
            </div>

            {/* Final Action */}
            <div className="pt-8">
              <button 
                onClick={handleCreateDraft}
                disabled={loading || profileLoading || !profileComplete}
                className="w-full py-6 rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-headline font-extrabold text-lg tracking-tight shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
                ) : profileLoading ? (
                  'Checking Profile...'
                ) : !profileComplete ? (
                  'Complete Profile To Continue'
                ) : (
                  <>
                    Review & Draft Application
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-[10px] font-medium text-outline-variant uppercase tracking-[0.2em]">Personalized offer subject to final credit assessment</p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
