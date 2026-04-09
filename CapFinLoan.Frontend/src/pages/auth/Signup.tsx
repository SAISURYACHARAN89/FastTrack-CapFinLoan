import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerificationToken, setOtpVerificationToken] = useState('');
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const { login } = useAuth();
  const navigate = useNavigate();

  const resetOtpState = () => {
    setOtp('');
    setOtpVerificationToken('');
    setIsOtpRequested(false);
    setIsOtpVerified(false);
  };

  const handleRequestOtp = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email before requesting OTP.');
      return;
    }

    setIsSendingOtp(true);

    try {
      await api.post('/auth/signup/request-otp', { email });
      setIsOtpRequested(true);
      setIsOtpVerified(false);
      setOtpVerificationToken('');
      setSuccess('OTP sent to your email. Please verify to continue signup.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email first.');
      return;
    }

    if (!otp.trim()) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await api.post('/auth/signup/verify-otp', { email, otp });
      setOtpVerificationToken(response.data.verificationToken);
      setIsOtpVerified(true);
      setSuccess('Email verified successfully. You can now create your account.');
    } catch (err: any) {
      setIsOtpVerified(false);
      setOtpVerificationToken('');
      setError(err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || 'Invalid or expired OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isOtpVerified || !otpVerificationToken) {
      setError('Please verify OTP before signing up.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/signup', { name, email, password, otpVerificationToken });
      setSuccess('Account created successfully! Please sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setError('');
    setSuccess('');
    setIsGoogleLoading(true);

    try {
      const response = await api.post('/auth/google', { idToken });
      const { token } = response.data;

      login(token, {
        userId: response.data.userId,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.title || 'Google authentication failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-surface">
      <section className="hidden lg:flex lg:w-[60%] relative flex-col justify-between p-20 mesh-gradient-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/15 blur-[120px]"></div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center shadow-lg shadow-primary-container/20">
            <span className="material-symbols-outlined text-on-primary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          <span className="font-headline font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-transparent">CapFinLoan</span>
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline text-6xl font-extrabold text-on-surface tracking-tight leading-[1.1] mb-8">
            Join the <span className="text-secondary">Future</span> of Capital Allocation.
          </h1>
          <p className="text-lg text-on-surface-variant/80 max-w-lg font-medium leading-relaxed">
            Create an applicant account to securely submit and track your institutional loan proposals globally.
          </p>
        </div>
      </section>

      <section className="w-full lg:w-[40%] flex flex-col bg-surface relative z-20">
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 xl:px-24">
          <div className="w-full max-w-md glass-panel p-10 lg:p-12 rounded-[2rem] shadow-2xl relative">
            
            <div className="mb-10">
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Create Account</h2>
              <p className="text-on-surface-variant font-medium">Apply for capital in minutes.</p>
            </div>
            
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl p-4 text-sm font-medium">
                  {success}
                </div>
              )}

              <div className="relative group">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#1c212e] text-xs font-label font-bold text-primary tracking-wide transition-all">
                  Full Name
                </label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#1c212e] text-xs font-label font-bold text-primary tracking-wide transition-all">
                  Corporate Email
                </label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    resetOtpState();
                  }}
                  required
                />
              </div>

              <button
                className="w-full border border-outline-variant/40 text-on-surface font-headline font-bold py-3 rounded-xl hover:bg-surface-container-low transition-all duration-200 disabled:opacity-60"
                type="button"
                onClick={handleRequestOtp}
                disabled={isSendingOtp || !email.trim()}
              >
                {isSendingOtp ? 'Sending OTP...' : isOtpRequested ? 'Resend OTP' : 'Send OTP'}
              </button>

              {isOtpRequested && (
                <div className="space-y-3">
                  <input
                    className="w-full text-on-surface focus:outline-none font-body font-medium text-center text-lg tracking-widest"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />

                  <button
                    className="w-full border border-secondary/50 text-secondary font-headline font-bold py-3 rounded-xl hover:bg-secondary/10 transition-all duration-200 disabled:opacity-60"
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otp.trim().length !== 6}
                  >
                    {isVerifyingOtp ? 'Verifying OTP...' : isOtpVerified ? 'OTP Verified' : 'Verify OTP'}
                  </button>
                </div>
              )}

              <div className="relative group">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#1c212e] text-xs font-label font-bold text-primary tracking-wide transition-all">
                  Password
                </label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button 
                className="w-full bg-primary-container text-on-primary-fixed flex items-center justify-center gap-2 font-headline font-bold py-4 rounded-xl shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200" 
                type="submit"
                disabled={isLoading || !isOtpVerified}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isOtpVerified ? 'Sign Up' : 'Verify OTP to Continue'
                )}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-outline-variant/30" />
                <span className="text-[11px] font-label tracking-wider uppercase text-outline">or</span>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>

              {isGoogleLoading && (
                <div className="text-center text-xs text-on-surface-variant">Signing in with Google...</div>
              )}

              <GoogleAuthButton
                clientId={googleClientId}
                mode="signup"
                onCredential={handleGoogleCredential}
              />
            </form>

            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="text-center text-sm font-medium text-on-surface-variant">
                Already have an account? 
                <Link to="/login" className="text-secondary font-bold hover:underline ml-1">Log In</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
