"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * While a guest still has the invitation ceremony open, poll admission status.
 * The moment the gate admits them (QR or manual code), jump straight into the
 * Event Companion, no soft-intro / envelope replay on this device session.
 */
export function AdmissionCompanionHandoff({
  link,
  companionHref,
  enabled,
  intervalMs = 4000,
}: {
  link: string;
  companionHref: string;
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled || !companionHref || !link) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (stopped.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, intervalMs);
        return;
      }
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
          };
          if (data.enabled && data.unlocked) {
            stopped.current = true;
            router.replace(companionHref);
            return;
          }
          if (data.state === "REVOKED" || data.state === "EXPIRED") {
            stopped.current = true;
            return;
          }
        }
      } catch {
        /* transient, keep polling */
      }
      timer = setTimeout(poll, intervalMs);
    }

    timer = setTimeout(poll, Math.min(1500, intervalMs));
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [link, companionHref, enabled, intervalMs, router]);

  return null;
}
