"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Quote = {
  catalog: { conciergePriceGhs: number; plans: { id: string; label: string; priceGhs: number }[] };
  quote: { designFeeGhs: number; subscriptionFeeGhs: number; totalGhs: number; planId: string | null };
};

export function CeleCardConciergeIntake() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [brief, setBrief] = useState("");
  const [includeSubscription, setIncludeSubscription] = useState(true);
  const [planId, setPlanId] = useState("yearly");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      quote: "1",
      includeSubscription: includeSubscription ? "1" : "0",
      planId,
    });
    fetch(`/api/digital-business-cards/concierge?${params}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setQuote(payload.data);
      })
      .catch(() => undefined);
  }, [includeSubscription, planId]);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/digital-business-cards/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        displayName: displayName || name,
        title,
        company,
        brief,
        includeSubscription,
        planId,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Could not submit this request.");
      return;
    }
    setOrderId(payload.data.id);
  }

  async function pay() {
    if (!orderId) return;
    setBusy(true);
    const res = await fetch(`/api/digital-business-cards/concierge/${orderId}/checkout`, { method: "POST" });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Checkout is not available yet.");
      return;
    }
    if (payload.data?.authorizationUrl) window.location.assign(payload.data.authorizationUrl);
  }

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {!orderId ? (
        <section className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">CeleYou Concierge</p>
            <h2 className="mt-1 font-display text-2xl font-bold">We design and activate it for you</h2>
            <p className="mt-2 text-sm text-slate-600">
              Share your details. The team prepares a ready-to-share CeleYou. Payment is recorded as a real checkout, never a fake transaction.
            </p>
          </div>
          <div>
            <Label>Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Name on the card</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>What should this CeleYou say?</Label>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={includeSubscription} onChange={(e) => setIncludeSubscription(e.target.checked)} />
            Include a live subscription term with this concierge order
          </label>
          {includeSubscription ? (
            <select className="rounded-md border px-3 py-2 sm:col-span-2" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {(quote?.catalog.plans ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label} · GH₵{plan.priceGhs}
                </option>
              ))}
            </select>
          ) : null}
          <p className="sm:col-span-2 text-sm text-slate-700">
            Design fee GH₵{quote?.quote.designFeeGhs ?? "—"}. Subscription GH₵{quote?.quote.subscriptionFeeGhs ?? 0}. Total GH₵{quote?.quote.totalGhs ?? "—"}.
          </p>
          <Button type="button" onClick={submit} disabled={busy || name.length < 2 || !email.includes("@") || brief.length < 12}>
            {busy ? "Submitting…" : "Request concierge design"}
          </Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Request received</h2>
          <p className="text-sm text-slate-600">
            Sign in with this email to pay. After verified payment, staff design and activate the card. Complimentary waivers never write a payment row.
          </p>
          <Button type="button" onClick={pay} disabled={busy}>
            {busy ? "Opening checkout…" : `Pay GH₵${quote?.quote.totalGhs ?? ""}`}
          </Button>
        </section>
      )}
    </div>
  );
}
