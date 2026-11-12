"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CeleYouShareSnapshot } from "@/lib/celeyou-connect/snapshots";

type Preview = {
  alreadyConnected: boolean;
  host: { displayName: string };
  you: CeleYouShareSnapshot;
  them: CeleYouShareSnapshot;
  visitorCardId: string;
};

export function DigitalCardConnectExchange({
  slug,
  isDemo,
  dock,
}: {
  slug: string;
  isDemo?: boolean;
  dock: {
    ghostBg: string;
    ghostFg: string;
    ghostBorder?: string;
    saveBg: string;
    saveFg: string;
    font: string;
    tracking: string;
    labelTransform: "none" | "uppercase" | "capitalize";
    actionRadius: number | string;
  };
}) {
  const { status } = useSession();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isDemo || status !== "authenticated") return;
    const ac = new AbortController();
    void fetch(`/api/digital-business-cards/connect/exchange?slug=${encodeURIComponent(slug)}`, {
      signal: ac.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.data?.canExchange) {
          setPreview(json.data as Preview);
          if (json.data.alreadyConnected) setDone(true);
        }
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [isDemo, slug, status]);

  if (isDemo || status !== "authenticated" || !preview) return null;

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/connect/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          visitorCardId: preview.visitorCardId,
          confirm: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not complete the exchange.");
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-kind="ghost"
        aria-label={done ? "Cards already exchanged" : "Exchange Cards"}
        className="celecard-action"
        style={{
          backgroundColor: dock.ghostBg,
          color: dock.ghostFg,
          borderColor: dock.ghostBorder ?? "rgba(28,25,23,0.14)",
          borderWidth: 1,
          borderStyle: "solid",
          fontFamily: dock.font,
          letterSpacing: dock.tracking,
          textTransform: dock.labelTransform,
          borderRadius: dock.actionRadius,
        }}
        onClick={() => {
          if (!done) setOpen(true);
        }}
      >
        <span className="celecard-action-mark" aria-hidden>
          <ArrowLeftRight />
        </span>
        <span className="celecard-action-copy">
          <span className="celecard-action-label whitespace-nowrap">
            {done ? "Connected" : "Exchange Cards"}
          </span>
        </span>
      </button>
      {open && !done ? (
        <div
          className="celecard-connect-layer fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center"
          role="dialog"
          aria-modal
          aria-labelledby="celeyou-exchange-title"
        >
          <button type="button" className="absolute inset-0" aria-label="Cancel exchange" onClick={() => setOpen(false)} />
          <div className="relative z-10 mb-[max(4.5rem,env(safe-area-inset-bottom))] w-full max-w-md space-y-3 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-2xl sm:mb-0">
            <p id="celeyou-exchange-title" className="text-base font-semibold text-slate-900">
              Connect with {preview.host.displayName}?
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              Share your selected CeleYou contact details with {preview.host.displayName} and receive the publicly shareable card details.
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">{preview.you.displayName}</p>
              <p>{[preview.you.title, preview.you.company].filter(Boolean).join(" · ") || "Your CeleYou"}</p>
              {preview.you.email ? <p>{preview.you.email}</p> : null}
              {preview.you.phone ? <p>{preview.you.phone}</p> : null}
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void confirm()}>
                {busy ? "Connecting…" : "Confirm Exchange"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function useCeleYouExchangeAvailable(slug: string, isDemo?: boolean) {
  const { status } = useSession();
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (isDemo || status !== "authenticated") {
      setAvailable(false);
      return;
    }
    const ac = new AbortController();
    void fetch(`/api/digital-business-cards/connect/exchange?slug=${encodeURIComponent(slug)}`, {
      signal: ac.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.data?.canExchange) setAvailable(true);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [isDemo, slug, status]);
  return available;
}
