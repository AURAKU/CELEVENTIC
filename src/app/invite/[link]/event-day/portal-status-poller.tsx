"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight admission-status poller (no real-time transport exists in the
 * repo yet — see discovery). Polls the no-store status endpoint and calls
 * router.refresh() when the unlock state flips, so the server component re-renders
 * with the locked/unlocked view. Stops polling on terminal states and pauses
 * while the tab is hidden.
 */
export function PortalStatusPoller({
  link,
  initialUnlocked,
  intervalMs = 8000,
}: {
  link: string;
  initialUnlocked: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const lastUnlocked = useRef(initialUnlocked);
  const stopped = useRef(false);

  useEffect(() => {
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
            unlocked?: boolean;
            state?: string;
          };
          if (typeof data.unlocked === "boolean" && data.unlocked !== lastUnlocked.current) {
            lastUnlocked.current = data.unlocked;
            router.refresh();
          }
          // Terminal states never change again — stop polling.
          if (data.state === "REVOKED" || data.state === "EXPIRED") {
            stopped.current = true;
            return;
          }
        }
      } catch {
        /* transient — keep polling */
      }
      timer = setTimeout(poll, intervalMs);
    }

    timer = setTimeout(poll, intervalMs);
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [link, intervalMs, router]);

  return null;
}
