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
import { SMARTCARD_CURRENCY, SMARTCARD_PLANS, type SmartCardPlan, type SmartCardPlanId } from "@/lib/digital-business-card/plans";
import { celeCardCheckoutUi } from "@/lib/digital-business-card/checkout-outcome";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";

type BillingCard = {
  id: string;
  slug: string;
  displayName: string;
  themeId: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  isLive: boolean;
  hoursLeft: number | null;
  lifecycleState?: string;
  canRenew?: boolean;
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
  if (card.lifecycleState === "COURTESY") return { label: "Ready to reactivate", variant: "warning" as const };
  if (card.lifecycleState === "GRACE_PERIOD") return { label: "Grace period", variant: "warning" as const };
  if (card.lifecycleState === "EXPIRING") return { label: "Renew soon", variant: "warning" as const };
  if (card.lifecycleState === "SUSPENDED") return { label: "Unavailable", variant: "destructive" as const };
  if (card.isLive) return { label: "Live", variant: "success" as const };
  if (card.subscriptionStatus === "EXPIRED") return { label: "Ready to reactivate", variant: "warning" as const };
  if (card.subscriptionStatus === "TRIAL") return { label: "Studio only", variant: "warning" as const };
  return { label: card.subscriptionStatus, variant: "outline" as const };
}

function remainingCopy(hoursLeft: number | null, expiresAt: string | null) {
  if (hoursLeft == null) return "No paid window yet. Activate a plan to go live.";
  if (hoursLeft <= 0) return "Your identity, designs, and sharing link are preserved.";
  const hours = Math.max(1, Math.round(hoursLeft));
  const when = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;
  if (hours <= 24) return `Live for about ${hours} hours${when ? `. Ends ${when}` : ""}. This term cannot be cancelled.`;
  if (hours <= 72) return `Renewal window is open. About ${hours} hours left${when ? `, until ${when}` : ""}. This term cannot be cancelled.`;
  return when
    ? `Paid through ${when}. This term cannot be cancelled.`
    : `About ${hours} hours remaining. This term cannot be cancelled.`;
}

export function SmartCardBillingClient() {
  const [cards, setCards] = useState<BillingCard[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<SmartCardPlanId>("yearly");
  const [plans, setPlans] = useState<SmartCardPlan[]>(SMARTCARD_PLANS);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [designChoices, setDesignChoices] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentLimit, setPaymentLimit] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [billingRes, plansRes] = await Promise.all([
        fetch(`/api/digital-business-cards/billing?page=${paymentPage}`),
        fetch("/api/digital-business-cards/plans"),
      ]);
      const json = await billingRes.json().catch(() => ({}));
      if (!billingRes.ok) throw new Error((json as { error?: string }).error || "Could not load billing");
      if (plansRes.ok) {
        const catalog = await plansRes.json();
        if (Array.isArray(catalog.data?.plans) && catalog.data.plans.length) {
          setPlans(catalog.data.plans as SmartCardPlan[]);
        }
      }
      const nextCards = (json.data?.cards ?? []) as BillingCard[];
      const nextPayments = (json.data?.payments ?? []) as BillingPayment[];
      setCards(nextCards);
      setPayments(nextPayments);
      setPaymentTotal(Number(json.data?.paymentTotal ?? nextPayments.length));
      setPaymentLimit(Number(json.data?.paymentLimit ?? 20));
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
  }, [paymentPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (params.get("payment") !== "callback" || !reference) return;

    void (async () => {
      let keepReference = false;
      try {
        const res = await fetch(
          `/api/digital-business-cards/subscribe/confirm?reference=${encodeURIComponent(reference)}`
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Payment could not be confirmed yet.");
        } else {
          const outcome = celeCardCheckoutUi(
            json.data?.status as string | undefined,
            json.data?.live as boolean | undefined
          );
          if (outcome.kind === "success") {
            setMessage(outcome.text);
            setDesignChoices(true);
            await load();
          } else if (outcome.kind === "error") {
            setError(outcome.text);
          } else {
            setMessage(outcome.text);
            keepReference = true;
          }
        }
      } catch {
        setError("Payment confirmation failed.");
      } finally {
        if (!keepReference) {
          const url = new URL(window.location.href);
          url.searchParams.delete("payment");
          url.searchParams.delete("reference");
          url.searchParams.delete("trxref");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }
    })();
  }, [load]);

  const active = useMemo(() => cards.find((card) => card.id === activeId) ?? null, [cards, activeId]);
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? plans[plans.length - 1] ?? SMARTCARD_PLANS[3];

  async function renew() {
    if (!active) {
      setError("Save a CeleYou in the studio first, then come back here to pay.");
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
      if (json.data?.inherited) {
        setMessage("This card now uses your current subscription.");
        await load();
        return;
      }
      if (json.data?.free) {
        setMessage("Plan activated. Your CeleYou is live.");
        setDesignChoices(true);
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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CeleYouBrandMark variant="chip" tone="light" markClassName="h-8 w-8" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Billing</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Keep the public card live
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Paid activation turns on QR, NFC, and the public page through Paystack. A paid term cannot
            be cancelled or renewed early. Extra cards you create stay on this same subscription, each
            with its own QR, link, and NFC. We remind you 14, 7, 3, and 1 days before it ends, then
            again after, by email and in-app notification.
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

      {designChoices ? (
        <section className="rounded-2xl border border-[#0B8A83]/20 bg-[#0B8A83]/5 p-5">
          <p className="font-display text-lg font-semibold text-slate-900">Your CeleYou is live again.</p>
          <p className="mt-1 text-sm text-slate-600">
            Identity, contacts, and your sharing link are unchanged. Redesign only if you want a new look.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button type="button" className="bg-[#0B8A83] hover:bg-[#097a74]" onClick={() => setDesignChoices(false)}>
              Keep my current design
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/business-card#celecard-theme">Choose a new design</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/business-card#celecard-design-vault">Duplicate a saved design</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/business-card#celecard-design-vault">Restore a previous design</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing…
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <p className="font-display text-lg font-semibold text-slate-900">No CeleYou yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Design the identity first. Billing and Paystack checkout unlock after the card is saved.
          </p>
          <Button asChild className="mt-5 bg-[#0B8A83] hover:bg-[#097a74]">
            <Link href="/dashboard/business-card">Design my CeleYou</Link>
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
                {active.lifecycleState === "COURTESY" || (!active.isLive && active.subscriptionStatus === "EXPIRED") ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Your CeleYou is ready when you are.</p>
                    <p className="mt-1 text-amber-900/80">
                      Your identity, designs, and sharing link are preserved. Reactivate to restore your complete digital profile.
                    </p>
                  </div>
                ) : active.lifecycleState === "DRAFT" || active.subscriptionStatus === "TRIAL" ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Studio is open. The public card stays unavailable until a verified payment activates it.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    {remainingCopy(active.hoursLeft, active.subscriptionExpiresAt)}
                  </p>
                )}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {plans.map((plan) => (
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
                  disabled={paying || active.canRenew === false}
                >
                  {paying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {active.canRenew === false
                    ? "Renewal opens after this term ends"
                    : `Activate ${selectedPlan.label} · ${SMARTCARD_CURRENCY} ${selectedPlan.priceGhs}`}
                </Button>
                <p className="mt-2 text-[11px] text-slate-500">
                  {active.canRenew === false
                    ? "Your paid term is still running. Extra cards you create stay on this same subscription."
                    : "Checkout opens Paystack. The card stays live only after payment succeeds. Paid terms cannot be ended early."}
                </p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Paystack charges</p>
            <p className="mt-1 text-xs text-slate-500">CeleYou subscriptions only. Event packages stay in account billing.</p>
            {payments.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No CeleYou payments yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {payments.map((payment) => (
                  <li key={payment.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {payment.planLabel || "CeleYou"} · {payment.currency} {payment.amount}
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
            {paymentTotal > paymentLimit ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Page {paymentPage} of {Math.max(1, Math.ceil(paymentTotal / paymentLimit))} · {paymentTotal} total
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={paymentPage <= 1 || loading}
                    onClick={() => setPaymentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={paymentPage * paymentLimit >= paymentTotal || loading}
                    onClick={() => setPaymentPage((page) => page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
