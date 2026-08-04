"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * While a guest still has the invitation ceremony open, poll admission status.
 *
 * Auto-jump to Event Companion only when the party is FULLY admitted (or the
 * caller opts in). Partial admission keeps the invitation available — the
 * PartyAdmissionSwitch banner offers “View Event Access” instead of replacing
 * the ceremony for remaining guests.
 */
export function AdmissionCompanionHandoff({
  link,
  companionHref,
  enabled,
  intervalMs = 12_000,
  /** Only auto-redirect when state is ADMITTED (default). Partial stays put. */
  onlyWhenFullyAdmitted = true,
}: {
  link: string;
  companionHref: string;
  enabled: boolean;
  intervalMs?: number;
  onlyWhenFullyAdmitted?: boolean;
}) {
  const router = useRouter();
  const stopped = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled || !companionHref || !link) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (stopped.current || inFlight.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, intervalMs);
        return;
      }
      inFlight.current = true;
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(link)}/admission-status`, {
          cache: "no-store",
          headers: { "cache-control": "no-store" },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            enabled?: boolean;
            unlocked?: boolean;
            state?: string;
            remainingCount?: number;
          };
          if (data.state === "REVOKED" || data.state === "EXPIRED") {
            stopped.current = true;
            return;
          }
          const fullyAdmitted =
            data.state === "ADMITTED" ||
            (typeof data.remainingCount === "number" && data.remainingCount <= 0);
          const shouldJump =
            data.enabled &&
            data.unlocked &&
            (onlyWhenFullyAdmitted ? fullyAdmitted : true);
          if (shouldJump) {
            stopped.current = true;
            router.replace(companionHref);
            return;
          }
        }
      } catch {
        /* transient, keep polling */
      } finally {
        inFlight.current = false;
      }
      timer = setTimeout(poll, intervalMs);
    }

    timer = setTimeout(poll, Math.min(2500, intervalMs));
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [link, companionHref, enabled, intervalMs, onlyWhenFullyAdmitted, router]);

  return null;
}
