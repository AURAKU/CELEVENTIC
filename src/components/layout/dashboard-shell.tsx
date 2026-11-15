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

/**
 * Same drawer pattern on phone, tablet, laptop, and desktop:
 * page stays full width; menu slides over; closing leaves no left gap.
 */
export function DashboardShell({ children, adminBanner }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!navOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  function closeNav() {
    setNavOpen(false);
  }

  function toggleNav() {
    setNavOpen((open) => !open);
  }

  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNav();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

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
    <div className="relative flex min-h-app-viewport bg-mesh overflow-x-hidden">
      <TermsAcceptanceGate />
      {navOpen ? (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/60 backdrop-blur-sm"
          onClick={closeNav}
          aria-hidden
        />
      ) : null}

      <Suspense fallback={null}>
        <DashboardSidebar open={navOpen} onClose={closeNav} />
      </Suspense>

      <div className="flex min-h-app-viewport min-w-0 flex-1 flex-col">
        {adminBanner}
        <DashboardTopbar menuOpen={navOpen} onMenuClick={toggleNav} />
        <main className="page-scaffold-host min-w-0 flex-1 overflow-x-hidden bg-dashboard grid-pattern p-3 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] sm:p-5 lg:p-6 lg:pb-8 xl:p-8">
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
