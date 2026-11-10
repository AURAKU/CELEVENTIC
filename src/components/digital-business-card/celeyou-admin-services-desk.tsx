"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleCardCommandDirectory } from "@/components/digital-business-card/celecard-command-directory";
import { CeleCardPricingForm } from "@/components/digital-business-card/celecard-pricing-form";
import { CeleCardAdminPolicyForm } from "@/components/digital-business-card/celecard-admin-policy-form";
import type { CeleCardLifecyclePolicy } from "@/lib/digital-business-card/lifecycle";
import type { CeleYouAdminServiceStatus } from "@/lib/digital-business-card/admin-services-catalog";

type ServiceRow = {
  id: string;
  title: string;
  summary: string;
  requires: string[];
  adminNeeds: string[];
  href: string;
  hrefLabel: string;
  status: CeleYouAdminServiceStatus;
};

type QueueRow = {
  id: string;
  displayName: string;
  slug: string;
  email: string | null;
  status: string;
  expiresAt: string | null;
};

type Snapshot = {
  health: {
    paystackReady: boolean;
    paystackPublicReady: boolean;
    shareOrigin: string;
    shareOriginIsLive: boolean;
    expectedLiveOrigin: string;
    themeCount: number;
    nfcDevices: number;
    nfcCardsCovered: number;
    cardsTotal: number;
    nfcCoverage: number;
    paymentsLast7Days: number;
    planCount: number;
  };
  overview: {
    total: number;
    activeCards: number;
    courtesyModeCards: number;
    suspendedCards: number;
    unclaimedCards: number;
    activeSubscriptions: number;
    expiringSoon: number;
    pendingConnectionRequests: number;
    conciergeOpen?: number;
    prepaidNote: string;
  };
  policy: CeleCardLifecyclePolicy;
  plans: Array<{ id: string; label: string; months: number; priceGhs: number }>;
  services: ServiceRow[];
  queues: {
    expiring: QueueRow[];
    unclaimed: QueueRow[];
    suspended: QueueRow[];
  };
};

type TabId = "overview" | "cards" | "billing" | "attention";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "cards", label: "Cards" },
  { id: "billing", label: "Billing and policy" },
  { id: "attention", label: "Needs attention" },
];

function statusBadge(status: CeleYouAdminServiceStatus) {
  if (status === "ready") return { label: "Ready", variant: "success" as const };
  if (status === "blocked") return { label: "Blocked", variant: "destructive" as const };
  return { label: "Needs setup", variant: "warning" as const };
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function HealthPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function QueueList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: QueueRow[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{row.displayName}</p>
                <p className="truncate text-[11px] text-slate-500">
                  /{row.slug}
                  {row.email ? ` · ${row.email}` : ""}
                </p>
                <p className="text-[11px] text-slate-400">{formatWhen(row.expiresAt)}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/celecard/${row.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CeleYouAdminServicesDesk({ canEditPrices = false }: { canEditPrices?: boolean }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/celecard/services");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Could not load CeleYou services");
      setData((json as { data: Snapshot }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load CeleYou services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attentionCount = data
    ? data.overview.expiringSoon +
      data.overview.unclaimedCards +
      data.overview.suspendedCards +
      data.overview.pendingConnectionRequests +
      (data.overview.conciergeOpen ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <CeleYouBrandMark variant="chip" tone="light" className="mb-3" markClassName="h-8 w-8" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Admin</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            CeleYou services
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Run identity, billing, NFC, and guest sharing from one desk. Ordinary users still pay through
            Paystack. Only platform admins can activate a card without payment.
          </p>
        </div>
        <div className="action-row">
          <Button asChild>
            <Link href="/admin/celecard/new">Create CeleYou</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/celecard/concierge">Concierge</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/business-card">Studio</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              tab === item.id
                ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {item.label}
            {item.id === "attention" && attentionCount > 0 ? ` · ${attentionCount}` : ""}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading || !data ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading CeleYou services…
        </div>
      ) : (
        <>
          {tab === "overview" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <HealthPill ok={data.health.paystackReady} label={data.health.paystackReady ? "Paystack connected" : "Paystack missing"} />
                <HealthPill
                  ok={data.health.shareOriginIsLive}
                  label={data.health.shareOriginIsLive ? "Live share origin" : "Share origin needs a live host"}
                />
                <HealthPill
                  ok={data.health.nfcCoverage >= 0.98 || data.health.cardsTotal === 0}
                  label={`NFC on ${data.health.nfcCardsCovered}/${data.health.cardsTotal} cards`}
                />
                <HealthPill ok={data.health.themeCount >= 30} label={`${data.health.themeCount} house templates`} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Cards", data.overview.total],
                  ["Live public", data.overview.activeCards],
                  ["Paid terms", data.overview.activeSubscriptions],
                  ["Expiring soon", data.overview.expiringSoon],
                  ["Unclaimed", data.overview.unclaimedCards],
                  ["Suspended", data.overview.suspendedCards],
                  ["Connect requests", data.overview.pendingConnectionRequests],
                  ["Concierge open", data.overview.conciergeOpen ?? 0],
                ].map(([label, count]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">What each service needs</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Guest QR and NFC always encode {data.health.expectedLiveOrigin}. Paystack charges from the last 7 days:{" "}
                      {data.health.paymentsLast7Days}.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                    Refresh
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {data.services.map((service) => (
                    <article key={service.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{service.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{service.summary}</p>
                        </div>
                        <Badge variant={statusBadge(service.status).variant}>{statusBadge(service.status).label}</Badge>
                      </div>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">Requires</p>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {service.requires.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">Admin does</p>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {service.adminNeeds.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <Button asChild size="sm" variant="ghost" className="mt-3 h-8 px-2 text-[#0B8A83]">
                        <Link href={service.href}>
                          {service.hrefLabel}
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </article>
                  ))}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ShieldCheck className="h-4 w-4 text-[#0B8A83]" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">Complimentary</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    ADMIN and SUPER_ADMIN may activate any user’s card without Paystack. Write a reason of at least 8 characters.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <CreditCard className="h-4 w-4 text-[#0B8A83]" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">Paid term</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Holders cannot cancel or renew until expiry. Extra cards share that term and keep unique QR, URL, and NFC.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <QrCode className="h-4 w-4 text-[#0B8A83]" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">Guest origin</p>
                  <p className="mt-1 break-all text-xs leading-relaxed text-slate-600">{data.health.shareOrigin}</p>
                </article>
              </div>
            </div>
          ) : null}

          {tab === "cards" ? <CeleCardCommandDirectory /> : null}

          {tab === "billing" ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Catalog</h2>
                <p className="mt-1 text-xs text-slate-500">{data.overview.prepaidNote}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {data.plans.map((plan) => (
                    <li key={plan.id}>
                      {plan.label}: GH₵{plan.priceGhs} · {plan.months} months
                    </li>
                  ))}
                </ul>
              </section>
              <CeleCardPricingForm canEdit={canEditPrices} />
              <section id="celeyou-policy" className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Policy</h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Timezone</dt>
                    <dd>{data.policy.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Grace period</dt>
                    <dd>{data.policy.gracePeriodDays} days</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Expiring window</dt>
                    <dd>{data.policy.expiringSoonDays} days</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Reminders (days)</dt>
                    <dd>{data.policy.reminderOffsetsDays.join(", ")}</dd>
                  </div>
                </dl>
              </section>
              <CeleCardAdminPolicyForm policy={data.policy} />
            </div>
          ) : null}

          {tab === "attention" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <QueueList title="Expiring soon" rows={data.queues.expiring} empty="No paid terms in the expiring window." />
              <QueueList title="Unclaimed" rows={data.queues.unclaimed} empty="No unclaimed invitation cards." />
              <QueueList title="Suspended" rows={data.queues.suspended} empty="No suspended CeleYou cards." />
              <section className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-[#0B8A83]" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Also waiting</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {data.overview.pendingConnectionRequests} new connection requests · {data.overview.conciergeOpen ?? 0}{" "}
                      concierge jobs open · {data.overview.courtesyModeCards} plates in courtesy.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/admin/celecard/concierge">Concierge queue</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/admin/celecard">Full directory</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
