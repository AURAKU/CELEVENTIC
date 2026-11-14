"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/i18n/locale-provider";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CeleYouShareSnapshot } from "@/lib/celeyou-connect/snapshots";

type Preview = {
  alreadyConnected: boolean;
  host: { displayName: string };
  you: CeleYouShareSnapshot;
  them: CeleYouShareSnapshot;
  visitorCardId: string;
  cards?: Array<{ id: string; displayName: string; title: string | null; company: string | null }>;
};

export function DigitalCardConnectExchange({
  slug,
  isDemo,
  tapJoinCode,
  onExchanged,
  dock,
}: {
  slug: string;
  isDemo?: boolean;
  tapJoinCode?: string;
  onExchanged?: () => void;
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
  const { t } = useLocale();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [cardId, setCardId] = useState("");

  useEffect(() => {
    if (isDemo || status !== "authenticated") return;
    const ac = new AbortController();
    const params = new URLSearchParams({ slug });
    if (cardId) params.set("visitorCardId", cardId);
    void fetch(`/api/digital-business-cards/connect/exchange?${params}`, {
      signal: ac.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.data?.canExchange) {
          setPreview(json.data as Preview);
          if (json.data.alreadyConnected) setDone(true);
          if (!cardId && json.data.visitorCardId) setCardId(json.data.visitorCardId);
        }
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [isDemo, slug, status, cardId]);

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
          visitorCardId: cardId || preview.visitorCardId,
          confirm: true,
          tapJoinCode: tapJoinCode || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : t("celeyou.exchange_failed"));
        return;
      }
      setDone(true);
      setOpen(false);
      onExchanged?.();
    } catch {
      setError(t("celeyou.network_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-kind="ghost"
        aria-label={done ? t("celeyou.exchange_done_aria") : t("celeyou.exchange_aria")}
        className={tapJoinCode ? "inline-flex h-11 w-full items-center justify-center rounded-full border text-sm" : "celecard-action"}
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
            {done ? t("celeyou.exchange_done") : t("celeyou.exchange_cards")}
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
          <button type="button" className="absolute inset-0" aria-label={t("celeyou.cancel_exchange")} onClick={() => setOpen(false)} />
          <div className="celecard-connect-panel relative z-10 mb-[max(4.5rem,env(safe-area-inset-bottom))] w-full space-y-3 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-2xl sm:mb-0">
            <p id="celeyou-exchange-title" className="text-base font-semibold text-slate-900">
              {t("celeyou.exchange_title", { name: preview.host.displayName })}
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              {t("celeyou.exchange_body", { name: preview.host.displayName })}
            </p>
            {preview.cards && preview.cards.length > 1 ? (
              <label className="block text-xs font-medium text-slate-700">
                {t("celeyou.share_this")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  value={cardId || preview.visitorCardId}
                  onChange={(event) => {
                    setCardId(event.target.value);
                    setDone(false);
                  }}
                >
                  {preview.cards.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">{preview.you.displayName}</p>
              <p>{[preview.you.title, preview.you.company].filter(Boolean).join(" · ") || t("celeyou.your_celeyou")}</p>
              {preview.you.email ? <p>{preview.you.email}</p> : null}
              {preview.you.phone ? <p>{preview.you.phone}</p> : null}
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void confirm()}>
                {busy ? t("celeyou.connecting") : t("celeyou.confirm_exchange")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("celeyou.cancel")}
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
