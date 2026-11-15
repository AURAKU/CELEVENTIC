"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { TermsAcceptanceGate } from "@/components/legal/terms-acceptance-gate";
import { ContextualHelpTrigger } from "@/components/celeventic-guide/contextual-help";
import { FirstRunTourHost } from "@/components/celeventic-guide/first-run-tour-host";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  adminBanner?: React.ReactNode;
}

const LG_QUERY = "(min-width: 1024px)";

export function DashboardShell({ children, adminBanner }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  const pathname = usePathname();

  // Desktop starts open; phone/tablet start closed. Respect a manual toggle after that.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(LG_QUERY);
    const syncDefault = () => {
      if (!userToggled) setNavOpen(mq.matches);
    };
    syncDefault();
    mq.addEventListener("change", syncDefault);
    return () => mq.removeEventListener("change", syncDefault);
  }, [userToggled]);

  // Navigating away closes the drawer on compact viewports only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia(LG_QUERY).matches) {
      setNavOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!navOpen || window.matchMedia(LG_QUERY).matches) {
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
    setUserToggled(true);
    setNavOpen(false);
  }

  function toggleNav() {
    setUserToggled(true);
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
    <div className="flex min-h-app-viewport bg-mesh overflow-x-hidden">
      <TermsAcceptanceGate />
      {navOpen ? (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={closeNav}
          aria-hidden
        />
      ) : null}

      <Suspense fallback={null}>
        <DashboardSidebar open={navOpen} onClose={closeNav} />
      </Suspense>

      {/* Keeps main content clear of the fixed drawer when it is open on desktop. */}
      <div
        aria-hidden
        className={cn(
          "hidden shrink-0 lg:block transition-[width] duration-300 ease-out",
          navOpen ? "w-[min(18rem,88vw)]" : "w-0"
        )}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-app-viewport">
        {adminBanner}
        <DashboardTopbar menuOpen={navOpen} onMenuClick={toggleNav} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] lg:pb-8 bg-dashboard grid-pattern min-w-0 overflow-x-hidden page-scaffold-host">
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
