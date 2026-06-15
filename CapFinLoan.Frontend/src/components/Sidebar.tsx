import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const APPLICANT_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { label: 'My Applications', icon: 'description', href: '/applications' },
  { label: 'New Application', icon: 'add_circle', href: '/applications/new' },
  { label: 'Wallet', icon: 'account_balance_wallet', href: '/wallet' },
  { label: 'Profile', icon: 'person', href: '/profile' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', icon: 'bar_chart', href: '/admin/dashboard' },
  { label: 'Application Queue', icon: 'list_alt', href: '/admin/applications' },
  { label: 'Payments', icon: 'account_balance_wallet', href: '/admin/payments' },
  { label: 'Reports', icon: 'pie_chart', href: '/admin/reports' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  const activeNav = user?.role === 'ADMIN' ? ADMIN_NAV : APPLICANT_NAV;

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-8">
      
      {/* Brand Logo */}
      <div className="px-8 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-indigo-500 font-headline">CapFinLoan</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
            {user?.role === 'ADMIN' ? 'Admin Portal' : 'Premium Capital'}
          </p>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-on-surface hover:bg-white/5 transition-colors"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {activeNav.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onMobileClose}
              className={
                isActive
                ? "bg-gradient-to-r from-indigo-500/10 to-transparent text-indigo-400 border-l-4 border-indigo-500 px-6 py-3 flex items-center gap-3 transition-all translate-x-1 duration-200"
                : "text-on-surface/50 px-6 py-3 border-l-4 border-transparent flex items-center gap-3 hover:text-on-surface hover:bg-outline-variant/10 transition-all"
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-manrope text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User Avatar Anchor */}
      <div className="px-6 pt-6 border-t border-outline-variant/15 mt-auto">
        <div className="flex justify-between items-center group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden border-2 border-primary/30 text-on-primary font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface truncate max-w-[100px]">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                toggle(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
              className="text-slate-500 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span key={theme} className="material-symbols-outlined text-lg theme-icon-enter">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            {/* Logout */}
            <button onClick={logout} className="text-slate-500 hover:text-error transition-colors p-2 rounded-lg hover:bg-error/10">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          h-screen w-64 fixed left-0 top-0 flex flex-col bg-surface-container-low shadow-[4px_0_24px_rgba(0,0,0,0.3)] z-50
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
