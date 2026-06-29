"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { PreferencesMenu } from "@/components/layout/preferences-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserAccountMenu, LogoutButton } from "@/components/layout/user-account-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

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
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl px-3 sm:px-4 lg:px-8 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 transition-colors touch-manipulation shrink-0"
            aria-label="Open admin menu"
          >
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900 flex-1 min-w-0 truncate">Admin Control Center</span>
          <WorkspaceSwitcher compact />
          <NotificationBell />
          <PreferencesMenu compact />
          <div className="hidden sm:block pl-2 border-l border-slate-200/80">
            <UserAccountMenu compact />
          </div>
          <div className="sm:hidden pl-1 border-l border-slate-200/80">
            <LogoutButton showLabel={false} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 bg-dashboard grid-pattern overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
