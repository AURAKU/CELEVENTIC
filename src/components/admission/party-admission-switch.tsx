"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPartyAdmissionProgress } from "@/lib/invitation/party-isolation";

type AdmissionPoll = {
  enabled?: boolean;
  unlocked?: boolean;
  state?: string;
  admittedCount?: number;
  remainingCount?: number;
  allowance?: number;
};

/**
 * Partial-admission progress + Invitation ↔ Event Access switch.
 * Polls only this invitation's admission-status endpoint (party-scoped).
 */
export function PartyAdmissionSwitch({
  link,
  companionHref,
  inviteHref,
  initialAdmittedCount,
  initialAllowance,
  initialState,
  mode,
  pollMs = 12_000,
}: {
  link: string;
  companionHref: string;
  inviteHref?: string | null;
  initialAdmittedCount: number;
  initialAllowance: number;
  initialState?: string | null;
  /** Where this banner is rendered. */
  mode: "invitation" | "event-access";
  pollMs?: number;
}) {
  const [admittedCount, setAdmittedCount] = useState(initialAdmittedCount);
  const [allowance, setAllowance] = useState(initialAllowance);
  const [state, setState] = useState(initialState ?? "NOT_ADMITTED");
  const inFlight = useRef(false);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current || stopped.current || !link) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/invite/${encodeURIComponent(link)}/admission-status`, {
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as AdmissionPoll;
      if (typeof data.admittedCount === "number") setAdmittedCount(data.admittedCount);
      if (typeof data.allowance === "number") setAllowance(data.allowance);
      if (data.state) setState(data.state);
    } catch {
      /* transient */
    } finally {
      inFlight.current = false;
    }
  }, [link]);

  useEffect(() => {
    stopped.current = false;
    void refresh();

    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refresh();
      }
    };
    const onFocus = () => void refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const fullyDone = state === "ADMITTED" || admittedCount >= Math.max(1, allowance);
      if (fullyDone || stopped.current) return;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, pollMs);
    };
    schedule();

    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, pollMs, state, admittedCount, allowance]);

  if (admittedCount <= 0 && mode === "invitation") return null;
  if (!companionHref && mode === "invitation") return null;

  const progress = formatPartyAdmissionProgress(admittedCount, allowance);
  const showSwitch = admittedCount > 0 && Boolean(companionHref);

  return (
    <aside
      aria-live="polite"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-20px_rgba(28,25,23,0.45)] backdrop-blur-md">
        <p className="text-sm font-semibold tracking-tight text-stone-800 transition-opacity duration-300">
          {progress.headline}
        </p>
        {progress.detail ? (
          <p className="text-xs font-medium text-stone-600">{progress.detail}</p>
        ) : null}
        {showSwitch ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {mode === "invitation" ? (
              <Link
                href={companionHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white touch-manipulation"
                aria-label="View event access for admitted guests"
              >
                View Event Access
              </Link>
            ) : inviteHref ? (
              <Link
                href={inviteHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-900 touch-manipulation"
                aria-label="Back to invitation"
              >
                Back to Invitation
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
