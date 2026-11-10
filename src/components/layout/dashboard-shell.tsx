"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { TermsAcceptanceGate } from "@/components/legal/terms-acceptance-gate";
import { ContextualHelpTrigger } from "@/components/celeventic-guide/contextual-help";
import { FirstRunTourHost } from "@/components/celeventic-guide/first-run-tour-host";

interface DashboardShellProps {
  children: React.ReactNode;
  adminBanner?: React.ReactNode;
}

export function DashboardShell({ children, adminBanner }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const tapMode = pathname.startsWith("/dashboard/business-card/tap");
  if (tapMode) {
    return (
      <>
        <TermsAcceptanceGate />
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-app-viewport bg-mesh overflow-x-hidden">
      <TermsAcceptanceGate />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <Suspense fallback={null}>
        <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0 min-h-app-viewport">
        {adminBanner}
        <DashboardTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[max(6.75rem,calc(env(safe-area-inset-bottom)+5.25rem))] lg:pb-8 bg-dashboard grid-pattern min-w-0 overflow-x-hidden page-scaffold-host">
          <div className="page-scaffold mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <MobileBottomNav />
        <ContextualHelpTrigger />
        <Suspense fallback={null}>
          <FirstRunTourHost />
        </Suspense>
      </div>
    </div>
  );
}
