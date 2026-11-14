"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CELEYOU_IDENTITY_STAYS_COPY,
  CELEYOU_TRIAL_NO_CARD_COPY,
  CELEYOU_TRY_PRO_CTA,
} from "@/lib/digital-business-card/freemium";

type TrialPayload = {
  eligibility?: { eligible?: boolean; reason?: string; message?: string };
  active?: boolean;
  clock?: { copy?: string; days?: number };
  trial?: { expiresAt?: string | null; status?: string };
  paidNow?: boolean;
  noCardCopy?: string;
};

export function CeleYouTrialCta({
  cardId,
  compact = false,
}: {
  cardId?: string | null;
  compact?: boolean;
}) {
  const [data, setData] = useState<TrialPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/digital-business-cards/trial");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setData(json.data as TrialPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: cardId || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error || "Could not start the trial.");
        await load();
        return;
      }
      await load();
    } catch {
      setError("Could not start the trial.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  if (data.paidNow) return null;

  if (data.active) {
    const when = data.trial?.expiresAt
      ? new Date(data.trial.expiresAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
    return (
      <section className="rounded-2xl border border-[#0B8A83]/25 bg-[#0B8A83]/6 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B8A83]">Your CeleYou Pro Trial</p>
        <p className="mt-1 font-display text-lg font-semibold text-slate-900">
          {data.clock?.copy || "Explore premium features."}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Explore premium features and upgrade whenever you are ready.
          {when ? ` Ends ${when}.` : ""} {CELEYOU_TRIAL_NO_CARD_COPY}
        </p>
        <Button asChild className="mt-3 bg-[#0B8A83] hover:bg-[#097a74]" size={compact ? "sm" : "default"}>
          <Link href="/dashboard/business-card/billing">Upgrade</Link>
        </Button>
      </section>
    );
  }

  if (!data.eligibility?.eligible) {
    if (data.eligibility?.reason === "unpublished") {
      return (
        <p className="text-sm text-slate-600">{data.eligibility.message}</p>
      );
    }
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#0B8A83]/20 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B8A83]">Optional</p>
      <p className="mt-1 font-display text-lg font-semibold text-slate-900">{CELEYOU_TRY_PRO_CTA}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Premium studio tools, extra published cards, and advanced analytics for 7 days. {CELEYOU_TRIAL_NO_CARD_COPY}{" "}
        {CELEYOU_IDENTITY_STAYS_COPY}
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <Button
        type="button"
        className="mt-3 bg-[#0B8A83] hover:bg-[#097a74]"
        size={compact ? "sm" : "default"}
        onClick={() => void activate()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {CELEYOU_TRY_PRO_CTA}
      </Button>
    </section>
  );
}
