"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CELECARD_CATALOG_EFFECTIVE_DATE_POLICY,
  CELECARD_CONCIERGE_EXPLANATION,
  CELECARD_CONCIERGE_SOLD_SEPARATELY,
  overlaySmartCardPlanPrices,
} from "@/lib/digital-business-card/plans";

type PlanPrices = { monthly: number; quarter: number; half: number; yearly: number };

type HistoryRow = {
  id: string;
  at: string;
  userId: string | null;
  details: { previous?: { planPrices?: PlanPrices; conciergePriceGhs?: number }; next?: { planPrices?: PlanPrices; conciergePriceGhs?: number } } | null;
};

type Catalog = {
  planPrices: PlanPrices;
  conciergePriceGhs: number;
  conciergeBundledPlanId: string;
  history?: HistoryRow[];
};

const PLAN_FIELDS: { id: keyof PlanPrices; label: string; duration: string }[] = [
  { id: "monthly", label: "Monthly", duration: "1 month" },
  { id: "quarter", label: "Quarterly", duration: "3 months" },
  { id: "half", label: "Half-Yearly", duration: "6 months" },
  { id: "yearly", label: "Yearly", duration: "12 months" },
];

export function CeleCardPricingForm({ canEdit }: { canEdit: boolean }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [saved, setSaved] = useState<Catalog | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/admin/celecard/pricing")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          setCatalog(payload.data);
          setSaved(payload.data);
        }
      })
      .catch(() => undefined);
  }, []);

  const preview = useMemo(
    () => (catalog ? overlaySmartCardPlanPrices(catalog.planPrices) : []),
    [catalog]
  );

  const dirty = Boolean(
    catalog &&
      saved &&
      (catalog.conciergePriceGhs !== saved.conciergePriceGhs ||
        PLAN_FIELDS.some((field) => catalog.planPrices[field.id] !== saved.planPrices[field.id]))
  );

  if (!catalog) return null;

  async function save() {
    if (!canEdit || !catalog) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/celecard/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planPrices: catalog.planPrices,
        conciergePriceGhs: Number(catalog.conciergePriceGhs),
        conciergeBundledPlanId: catalog.conciergeBundledPlanId,
        confirm,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload.error || "Could not save prices.");
      return;
    }
    setCatalog(payload.data);
    setSaved(payload.data);
    setConfirm(false);
    setMessage("Prices published. Existing payments were not rewritten.");
  }

  function setPrice(id: keyof PlanPrices, value: string) {
    setCatalog((current) =>
      current ? { ...current, planPrices: { ...current.planPrices, [id]: Number(value) || 0 } } : current
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold">1. Subscription Catalog</h2>
        <p className="mt-1 text-xs text-slate-500">
          This is the published CeleYou Pro catalog. Checkout uses these amounts, not a browser value.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {preview.map((plan) => (
            <li key={plan.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                {plan.label} · {plan.durationLabel}
              </span>
              <span className="font-medium">
                GH₵{plan.priceGhs}
                {plan.savePercent > 0 ? ` · save about ${plan.savePercent}%` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold">2. Published Pricing</h2>
        <p className="mt-1 text-xs text-slate-500">
          Super Admin only. {CELECARD_CATALOG_EFFECTIVE_DATE_POLICY}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLAN_FIELDS.map((field) => (
            <label key={field.id} className="text-sm">
              {field.label} · {field.duration} (GHS)
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                disabled={!canEdit}
                inputMode="numeric"
                value={catalog.planPrices[field.id]}
                onChange={(e) => setPrice(field.id, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold">3. Concierge Pricing</h2>
        <p className="mt-1 text-xs text-slate-500">
          One-time design fee. {CELECARD_CONCIERGE_SOLD_SEPARATELY} {CELECARD_CONCIERGE_EXPLANATION}
        </p>
        <label className="mt-4 block text-sm">
          Professional Concierge Design (GHS)
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 sm:max-w-xs"
            disabled={!canEdit}
            inputMode="numeric"
            value={catalog.conciergePriceGhs}
            onChange={(e) => setCatalog({ ...catalog, conciergePriceGhs: Number(e.target.value) || 0 })}
          />
        </label>
      </section>

      {canEdit ? (
        <div className="rounded-2xl border bg-white p-5">
          {dirty ? (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              Confirm this catalog change. Settled payments and current paid terms stay at the amount already charged.
            </label>
          ) : (
            <p className="text-xs text-slate-500">No unpublished edits.</p>
          )}
          <Button className="mt-4" type="button" onClick={save} disabled={saving || (dirty && !confirm)}>
            {saving ? "Saving…" : "Publish prices"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">You can view these prices. Only a Super Admin can change them.</p>
      )}
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold">6. Pricing History</h2>
        <p className="mt-1 text-xs text-slate-500">Audit of published catalog changes. Payment rows are not listed here.</p>
        {catalog.history?.length ? (
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {catalog.history.map((row) => (
              <li key={row.id} className="rounded-lg bg-slate-50 px-3 py-2">
                {new Date(row.at).toLocaleString()} · yearly GH₵{row.details?.next?.planPrices?.yearly ?? "—"} ·
                concierge GH₵{row.details?.next?.conciergePriceGhs ?? "—"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No catalog edits recorded yet.</p>
        )}
      </section>
    </div>
  );
}
