"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Catalog = {
  planPrices: { monthly: number; quarter: number; half: number; yearly: number };
  conciergePriceGhs: number;
  conciergeBundledPlanId: string;
};

export function CeleCardPricingForm({ canEdit }: { canEdit: boolean }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/celecard/pricing")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setCatalog(payload.data);
      })
      .catch(() => undefined);
  }, []);

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
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload.error || "Could not save prices.");
      return;
    }
    setCatalog(payload.data);
    setMessage("Prices saved. Existing payments were not rewritten.");
  }

  function setPrice(id: keyof Catalog["planPrices"], value: string) {
    setCatalog((current) =>
      current ? { ...current, planPrices: { ...current.planPrices, [id]: Number(value) || 0 } } : current
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-sm font-semibold">Subscription and concierge prices</h2>
      <p className="mt-1 text-xs text-slate-500">
        Super Admin only. Card admins can view. Historical payments stay unchanged.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(["monthly", "quarter", "half", "yearly"] as const).map((id) => (
          <label key={id} className="text-sm">
            {id} (GHS)
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              disabled={!canEdit}
              value={catalog.planPrices[id]}
              onChange={(e) => setPrice(id, e.target.value)}
            />
          </label>
        ))}
        <label className="text-sm">
          Concierge design fee (GHS)
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            disabled={!canEdit}
            value={catalog.conciergePriceGhs}
            onChange={(e) => setCatalog({ ...catalog, conciergePriceGhs: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      {canEdit ? (
        <Button className="mt-4" type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save prices"}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-slate-500">You can view these prices. Only a Super Admin can change them.</p>
      )}
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
