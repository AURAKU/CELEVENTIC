"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TourEngine } from "@/components/celeventic-guide/tour-engine";
import {
  consumePendingWelcomeTour,
  isTourCompleted,
} from "@/lib/celeventic-guide/tour-storage";

const WELCOME_TOUR_ID = "welcome-navigation";

/**
 * After Finish Setup, starts the first-run navigation tutor on the dashboard.
 * Triggered by `?tour=welcome` or a one-shot pending flag in localStorage.
 */
export function FirstRunTourHost() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tourId, setTourId] = useState<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/getting-started")) return;
    if (pathname.startsWith("/vendor/onboarding")) return;
    if (isTourCompleted(WELCOME_TOUR_ID)) return;

    const fromQuery = searchParams.get("tour") === "welcome";
    const fromPending = consumePendingWelcomeTour();
    if (!fromQuery && !fromPending) return;

    setTourId(WELCOME_TOUR_ID);

    if (fromQuery) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("tour");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  if (!tourId) return null;

  return (
    <TourEngine
      tourId={tourId}
      onClose={() => setTourId(null)}
    />
  );
}
