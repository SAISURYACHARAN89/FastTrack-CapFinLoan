import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/axios';

export function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Password reset OTP sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'User not found. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-reset-otp', { email, otp });
      const token = response.data.verificationToken || response.data.VerificationToken;
      setVerificationToken(token);
      setSuccess('OTP verified successfully.');
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { 
        email, 
        verificationToken, 
        newPassword 
      });
      setSuccess('Password has been reset successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.main 
      initial={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-screen w-full items-center justify-center p-6 relative overflow-hidden"
    >
      {/* Interactive 2D Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: ['20%', '-20%', '20%'],
            y: ['-20%', '20%', '-20%'],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-secondary-container/10 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: ['-20%', '20%', '-20%'],
            y: ['20%', '-20%', '20%'],
            scale: [1, 1.5, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-[-10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-primary-container/10 blur-[120px]"
        />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="glass-panel p-8 sm:p-10 rounded-[2rem] shadow-2xl backdrop-blur-3xl border border-white/5">

          <div className="flex flex-col items-center mb-8 text-center">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mb-2 tracking-tight">Account Recovery</h2>
            <p className="text-sm text-on-surface-variant font-medium">
              {step === 1 && "Enter your email to receive a reset code."}
              {step === 2 && "Enter the 6-digit verification code."}
              {step === 3 && "Create your new secure password."}
            </p>
          </div>

          <form onSubmit={step === 1 ? handleRequestOtp : step === 2 ? handleVerifyOtp : handleResetPassword} className="space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-error/10 text-error border border-error/20 rounded-xl p-3 text-sm font-medium text-center"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl p-3 text-sm font-medium text-center"
              >
                {success}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                <label className="block text-xs font-label font-bold text-primary tracking-wide ml-1" htmlFor="email">
                  Email
                </label>
                <input
                  className="w-full bg-surface-container-lowest/50 border border-outline-variant/20 rounded-xl px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium placeholder:text-outline-variant/50"
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                <label className="block text-xs font-label font-bold text-primary tracking-wide ml-1" htmlFor="otp">
                  Verification Code
                </label>
                <input
                  className="w-full bg-surface-container-lowest/50 border border-secondary/30 rounded-xl px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all font-body font-bold text-center text-lg tracking-[0.5em]"
                  id="otp"
                  type="text"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-label font-bold text-primary tracking-wide ml-1" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest/50 border border-outline-variant/20 rounded-xl px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium placeholder:text-outline-variant/50"
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-label font-bold text-primary tracking-wide ml-1" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest/50 border border-outline-variant/20 rounded-xl px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium placeholder:text-outline-variant/50"
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </motion.div>
            )}

            <button
              className="w-full mt-6 bg-primary-container text-on-primary-fixed flex items-center justify-center gap-2 font-headline font-bold py-3.5 rounded-xl shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
              ) : (
                step === 1 ? 'Send Reset Code' : step === 2 ? 'Verify Code' : 'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-on-surface-variant">
            Remembered your password?
            <Link to="/login" className="text-secondary font-bold hover:underline ml-1">Log In</Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-label font-bold uppercase tracking-widest text-outline/60">
          <a className="hover:text-on-surface transition-colors" href="#">Terms</a>
          <a className="hover:text-on-surface transition-colors" href="#">Privacy</a>
          <span>© 2026</span>
        </div>
      </div>
    </motion.main>
  );
}
