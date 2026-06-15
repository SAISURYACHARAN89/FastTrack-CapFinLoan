import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex selection:bg-primary-container/30">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by sidebar only on lg+ */}
      <div className="flex-1 flex flex-col lg:ml-64">

        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface-container-low/80 backdrop-blur-xl border-b border-white/5 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-on-surface hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <h1 className="text-base font-black text-indigo-500 font-headline">CapFinLoan</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-12 xl:p-20">
          {children}
        </main>

        {/* Footer Shell */}
        <footer className="py-6 mt-auto border-t border-white/5 bg-surface-dim dark:bg-[#0f131d]">
          <div className="flex flex-col md:flex-row justify-between items-center px-4 sm:px-8 lg:px-12 opacity-60 gap-2">
            <p className="font-manrope text-xs tracking-wide text-slate-600">© 2026 CapFinLoan. All rights reserved.</p>
            <div className="flex gap-6 mt-2 md:mt-0">
              <span className="font-manrope text-xs text-slate-600">Gateway Status: Online</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
