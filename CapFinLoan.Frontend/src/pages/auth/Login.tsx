import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/axios';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      
      login(token, {
        userId: response.data.userId,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role
      });

    } catch (err: any) {
      setError(err.response?.data?.title || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setError('');
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
            x: ['-20%', '20%', '-20%'],
            y: ['-20%', '20%', '-20%'],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-primary-container/10 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: ['20%', '-20%', '20%'],
            y: ['20%', '-20%', '20%'],
            scale: [1, 1.5, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-secondary-container/10 blur-[120px]"
        />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="glass-panel p-8 sm:p-10 rounded-[2rem] shadow-2xl backdrop-blur-3xl border border-white/5">
          
          <div className="flex flex-col items-center mb-10">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-on-surface-variant font-medium">Log in to your dashboard</p>
          </div>
          
          <form aria-label="login-form" onSubmit={handleLogin} className="space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-error/10 text-error border border-error/20 rounded-xl p-3 text-sm font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-xs leading-none font-label font-bold text-primary tracking-wide" htmlFor="password">
                  Password
                </label>
                <Link className="text-xs font-bold text-secondary hover:text-secondary-fixed-dim transition-colors" to="/forgot-password">Forgot?</Link>
              </div>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-lowest/50 border border-outline-variant/20 rounded-xl px-4 pr-12 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium placeholder:text-outline-variant/50" 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.8c4.5 0 8.2 2.7 9.7 6.5a10.92 10.92 0 0 1-3.04 4.16" />
                      <path d="M6.61 6.61A10.92 10.92 0 0 0 2.3 11.3c1.5 3.8 5.2 6.5 9.7 6.5 1.67 0 3.24-.37 4.64-1.03" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M2.3 12s3.7-6.5 9.7-6.5 9.7 6.5 9.7 6.5-3.7 6.5-9.7 6.5S2.3 12 2.3 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              className="w-full mt-6 bg-primary-container text-on-primary-fixed flex items-center justify-center gap-2 font-headline font-bold py-3.5 rounded-xl shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Secure Login'
              )}
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-outline-variant/30" />
              <span className="text-[10px] font-label tracking-[0.1em] uppercase text-outline">or</span>
              <div className="h-px flex-1 bg-outline-variant/30" />
            </div>

            {isGoogleLoading && (
              <div className="text-center text-xs text-on-surface-variant">Signing in with Google...</div>
            )}

            <GoogleAuthButton
              clientId={googleClientId}
              mode="signin"
              onCredential={handleGoogleCredential}
            />
          </form>

          <div className="mt-8 text-center text-sm font-medium text-on-surface-variant">
            Don't have an account? 
            <Link to="/signup" className="text-primary font-bold hover:underline ml-1">Sign Up</Link>
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
