import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/axios';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <main className="flex min-h-screen w-full bg-surface">
      {/* Left 60%: Hero Section */}
      <section className="hidden lg:flex lg:w-[60%] relative flex-col justify-between p-20 mesh-gradient-bg overflow-hidden">
        {/* Animated Mesh Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/15 blur-[120px]"></div>
        </div>
        
        {/* Header Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center shadow-lg shadow-primary-container/20">
            <span className="material-symbols-outlined text-on-primary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          <span className="font-headline font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-transparent">CapFinLoan</span>
        </div>
        
        {/* Central Hero Text */}
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline text-6xl font-extrabold text-on-surface tracking-tight leading-[1.1] mb-8">
            Unlocking <span className="text-primary">Premium Capital</span> for Visionary Enterprises.
          </h1>
          <p className="text-lg text-on-surface-variant/80 max-w-lg font-medium leading-relaxed">
            Navigate the complexities of institutional finance with a precision instrument designed for the next generation of global industry leaders.
          </p>
        </div>
        
        {/* Footer Stats */}
        <div className="relative z-10 flex gap-12 border-t border-white/5 pt-12">
          <div>
            <div className="text-sm font-label text-outline uppercase tracking-widest mb-1">Assets Managed</div>
            <div className="font-headline text-3xl font-bold tabular-nums text-on-surface">$2.4B<span className="text-secondary">+</span></div>
          </div>
          <div>
            <div className="text-sm font-label text-outline uppercase tracking-widest mb-1">Global Partners</div>
            <div className="font-headline text-3xl font-bold tabular-nums text-on-surface">150<span className="text-primary-fixed-dim">+</span></div>
          </div>
        </div>
      </section>

      {/* Right 40%: Auth Panel */}
      <section className="w-full lg:w-[40%] flex flex-col bg-surface relative z-20">
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 xl:px-24">
          <div className="w-full max-w-md glass-panel p-10 lg:p-12 rounded-[2rem] shadow-2xl relative">
            
            <div className="mb-10">
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Welcome Back</h2>
              <p className="text-on-surface-variant font-medium">Access your institutional dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Email Input Group */}
              <div className="space-y-2">
                <label className="block text-xs font-label font-bold text-primary tracking-wide" htmlFor="email">
                  Corporate Email
                </label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  id="email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input Group */}
              <div className="space-y-3">
                <label className="block text-xs leading-none font-label font-bold text-primary tracking-wide" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 pr-12 py-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.8c4.5 0 8.2 2.7 9.7 6.5a10.92 10.92 0 0 1-3.04 4.16" />
                        <path d="M6.61 6.61A10.92 10.92 0 0 0 2.3 11.3c1.5 3.8 5.2 6.5 9.7 6.5 1.67 0 3.24-.37 4.64-1.03" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                        <path d="M2.3 12s3.7-6.5 9.7-6.5 9.7 6.5 9.7 6.5-3.7 6.5-9.7 6.5S2.3 12 2.3 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span></span>
                <a className="text-sm font-bold text-primary hover:text-primary-fixed-dim transition-colors" href="#">Forgot Password?</a>
              </div>

              <button 
                className="w-full bg-primary-container text-on-primary-fixed flex items-center justify-center gap-2 font-headline font-bold py-4 rounded-xl shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Secure Login'
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="flex flex-col gap-4">
                <div className="text-center text-sm font-medium text-on-surface-variant">
                  Don't have an account? 
                  <Link to="/signup" className="text-secondary font-bold hover:underline ml-1">Sign Up</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <footer className="p-8 lg:px-12 opacity-40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-label font-bold uppercase tracking-[0.2em] text-outline">
            <div className="flex gap-6">
              <a className="hover:text-on-surface transition-colors" href="#">Terms of Service</a>
              <a className="hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
            </div>
            <p>© 2026 CapFinLoan. All rights reserved.</p>
          </div>
        </footer>
      </section>
    </main>
  );
}
