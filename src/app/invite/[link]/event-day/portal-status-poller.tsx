"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls admission status while the companion is open. If the organiser resets
 * admission, send the guest back to the invitation, the companion is admit-only.
 */
export function PortalStatusPoller({
  link,
  initialUnlocked = true,
  intervalMs = 8000,
}: {
  link: string;
  initialUnlocked?: boolean;
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
          if (data.unlocked === false) {
            stopped.current = true;
            router.replace(`/invite/${encodeURIComponent(link)}`);
            return;
          }
          if (typeof data.unlocked === "boolean" && data.unlocked !== lastUnlocked.current) {
            lastUnlocked.current = data.unlocked;
            router.refresh();
          }
          if (data.state === "REVOKED" || data.state === "EXPIRED") {
            stopped.current = true;
            router.replace(`/invite/${encodeURIComponent(link)}`);
            return;
          }
        }
      } catch {
        /* transient, keep polling */
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
