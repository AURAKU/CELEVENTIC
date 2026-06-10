"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-mesh">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Open admin menu"
          >
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">Admin Command Center</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 bg-dashboard grid-pattern overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
