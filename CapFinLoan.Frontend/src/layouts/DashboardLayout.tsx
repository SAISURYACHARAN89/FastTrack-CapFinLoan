import type { ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface flex selection:bg-primary-container/30">
      <Sidebar />
      <div className="flex-1 flex flex-col pt-0">
        <main className="ml-64 flex-1 p-12 lg:p-20">
          {children}
        </main>
        {/* Footer Shell */}
        <footer className="ml-64 w-[calc(100%-16rem)] py-6 mt-auto border-t border-white/5 bg-surface-dim dark:bg-[#0f131d]">
          <div className="flex flex-col md:flex-row justify-between items-center px-12 opacity-60">
            <p className="font-manrope text-xs tracking-wide text-slate-600">© 2026 CapFinLoan. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span className="font-manrope text-xs text-slate-600">Gateway Status: Online</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
