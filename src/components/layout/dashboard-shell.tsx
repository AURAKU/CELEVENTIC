"use client";

import { Suspense, useState } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { TermsAcceptanceGate } from "@/components/legal/terms-acceptance-gate";
interface DashboardShellProps {
  children: React.ReactNode;
  adminBanner?: React.ReactNode;
}

export function DashboardShell({ children, adminBanner }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-mesh">
      <TermsAcceptanceGate />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Suspense fallback={null}>
        <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        {adminBanner}
        <DashboardTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-dashboard grid-pattern min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
