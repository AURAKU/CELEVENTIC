"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SMARTCARD_CURRENCY, SMARTCARD_PLANS, type SmartCardPlanId } from "@/lib/digital-business-card/plans";

type BillingCard = {
  id: string;
  slug: string;
  displayName: string;
  themeId: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  isLive: boolean;
  hoursLeft: number | null;
};

type BillingPayment = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  planId: string | null;
  planLabel: string | null;
  cardId: string | null;
};

function statusBadge(card: BillingCard) {
  if (card.isLive) return { label: "Live", variant: "success" as const };
  if (card.subscriptionStatus === "EXPIRED") return { label: "Expired", variant: "destructive" as const };
  if (card.subscriptionStatus === "TRIAL") return { label: "Studio only", variant: "warning" as const };
  return { label: card.subscriptionStatus, variant: "outline" as const };
}

function remainingCopy(hoursLeft: number | null, expiresAt: string | null) {
  if (hoursLeft == null) return "No paid window yet. Activate a plan to go live.";
  if (hoursLeft <= 0) return "Public card is off. Renew to turn QR, NFC, and Wallet back on.";
  const hours = Math.max(1, Math.round(hoursLeft));
  const when = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;
  if (hours <= 24) return `Live for about ${hours} hours${when ? `. Ends ${when}` : ""}.`;
  if (hours <= 72) return `Renewal window is open. About ${hours} hours left${when ? `, until ${when}` : ""}.`;
  return when ? `Paid through ${when}.` : `About ${hours} hours remaining.`;
}

export function SmartCardBillingClient() {
  const [cards, setCards] = useState<BillingCard[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<SmartCardPlanId>("yearly");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/billing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load billing");
      const nextCards = (json.data?.cards ?? []) as BillingCard[];
      const nextPayments = (json.data?.payments ?? []) as BillingPayment[];
      setCards(nextCards);
      setPayments(nextPayments);
      setActiveId((current) => {
        if (current && nextCards.some((card) => card.id === current)) return current;
        const wanted = new URLSearchParams(window.location.search).get("card");
        if (wanted && nextCards.some((card) => card.id === wanted)) return wanted;
        return nextCards[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (params.get("payment") !== "callback" || !reference) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/digital-business-cards/subscribe/confirm?reference=${encodeURIComponent(reference)}`
        );
        const json = await res.json();
        if (res.ok && json.data?.status === "SUCCESSFUL") {
          setMessage("Payment received. Your CeleCard is live while this plan lasts.");
          await load();
        } else if (!res.ok) {
          setError(json.error || "Payment could not be confirmed yet.");
        }
      } catch {
        setError("Payment confirmation failed.");
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    })();
  }, [load]);

  const active = useMemo(() => cards.find((card) => card.id === activeId) ?? null, [cards, activeId]);
  const selectedPlan = SMARTCARD_PLANS.find((plan) => plan.id === planId) ?? SMARTCARD_PLANS[3];

  async function renew() {
    if (!active) {
      setError("Save a CeleCard in the studio first, then come back here to pay.");
      return;
    }
    setPaying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${active.id}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (json.data?.free) {
        setMessage("Plan activated. Your CeleCard is live.");
        await load();
        return;
      }
      if (json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl as string;
        return;
      }
      throw new Error("Paystack did not return a checkout URL");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 text-[#0B8A83]">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">CeleCard billing</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Keep the public card live
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Paid activation turns on QR, NFC, Wallet, and the public page. We remind you at 72, 48, and
            24 hours, then again when the plan lapses, by email, WhatsApp, and SMS.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/business-card">
            Open studio
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <Mail className="h-4 w-4 text-[#0B8A83]" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Email</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Sent to the address on the card, or your Celeventic account if the card has none.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <MessageCircle className="h-4 w-4 text-[#0B8A83]" />
          <p className="mt-2 text-sm font-semibold text-slate-900">WhatsApp</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Uses the WhatsApp number on the card, then your account phone.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <Smartphone className="h-4 w-4 text-[#0B8A83]" />
          <p className="mt-2 text-sm font-semibold text-slate-900">SMS</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Same phone path as WhatsApp. Each window is sent once, never stacked.
          </p>
        </article>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#0B8A83]">{message}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing…
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <p className="font-display text-lg font-semibold text-slate-900">No CeleCard yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Design the identity first. Billing and Paystack checkout unlock after the card is saved.
          </p>
          <Button asChild className="mt-5 bg-[#0B8A83] hover:bg-[#097a74]">
            <Link href="/dashboard/business-card">Design my CeleCard</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveId(card.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    card.id === activeId
                      ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {card.displayName}
                </button>
              ))}
            </div>

            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-slate-900">{active.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">/{active.slug}</p>
                  </div>
                  <Badge variant={statusBadge(active).variant}>{statusBadge(active).label}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {remainingCopy(active.hoursLeft, active.subscriptionExpiresAt)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {SMARTCARD_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                        planId === plan.id
                          ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-semibold">{plan.label}</span>
                      <span className="ml-1">
                        {SMARTCARD_CURRENCY} {plan.priceGhs}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-500">{plan.blurb}</p>
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full bg-[#0B8A83] hover:bg-[#097a74]"
                  onClick={() => void renew()}
                  disabled={paying}
                >
                  {paying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {active.isLive ? "Extend" : "Activate"} {selectedPlan.label} · {SMARTCARD_CURRENCY}{" "}
                  {selectedPlan.priceGhs}
                </Button>
                <p className="mt-2 text-[11px] text-slate-500">
                  Checkout opens Paystack. The card stays live only after payment succeeds.
                </p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Paystack charges</p>
            <p className="mt-1 text-xs text-slate-500">CeleCard subscriptions only. Event packages stay in account billing.</p>
            {payments.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No CeleCard payments yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {payments.map((payment) => (
                  <li key={payment.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {payment.planLabel || "CeleCard"} · {payment.currency} {payment.amount}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {new Date(payment.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        <p className="mt-0.5 break-all text-[11px] text-slate-400">{payment.reference}</p>
                      </div>
                      <Badge
                        variant={
                          payment.status === "SUCCESSFUL"
                            ? "success"
                            : payment.status === "FAILED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {payment.status === "SUCCESSFUL" ? "Paid" : payment.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
