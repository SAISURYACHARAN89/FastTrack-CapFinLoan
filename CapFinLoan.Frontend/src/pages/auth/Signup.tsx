import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/axios';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await api.post('/auth/signup', { name, email, password });
      setSuccess('Account created successfully! Please sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.title || 'Registration failed');
    } finally {
      setIsLoading(false);
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
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  placeholder="John Doe" 
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
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  placeholder="name@enterprise.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <label className="absolute -top-2.5 left-4 px-1 bg-[#1c212e] text-xs font-label font-bold text-primary tracking-wide transition-all">
                  Password
                </label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-body font-medium" 
                  placeholder="••••••••••••" 
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Sign Up'
                )}
              </button>
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
