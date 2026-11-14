"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  Contact,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Nfc,
  Phone,
  QrCode,
  Share2,
  Users,
} from "lucide-react";
import { celeYouActivityLabel } from "@/lib/celeyou-share/events";
import {
  activityRangeQuery,
  defaultActivityRange,
  formatActivityHeroCaption,
  type ActivityDateRange,
} from "@/lib/digital-business-card/activity-range";
import { DigitalCardActivityRange } from "@/components/digital-business-card/digital-card-activity-range";
import styles from "./digital-card-analytics-panel.module.css";

const DigitalCardAnalyticsChart = dynamic(
  () =>
    import("@/components/digital-business-card/digital-card-analytics-chart").then(
      (mod) => mod.DigitalCardAnalyticsChart
    ),
  { ssr: false, loading: () => <p className="mt-2 text-xs text-slate-500">Loading trend…</p> }
);

type Analytics = {
  viewCount: number;
  qrOpens?: number;
  nfcTaps?: number;
  vcardSaves?: number;
  vcardDownloads?: number;
  callTaps?: number;
  whatsappTaps?: number;
  emailTaps?: number;
  websiteTaps?: number;
  socialTaps?: number;
  locationTaps?: number;
  meetingOpens?: number;
  meetingBooked?: number;
  paymentOpens?: number;
  shares?: number;
  connects?: number;
  reconnects?: number;
  popular?: Array<{ kind: string; label: string; count: number; outcome: string }>;
  devices?: { phone: number; tablet: number; desktop: number; unknown: number };
  trend?: Array<{ day: string; views: number; actions: number }>;
  notes?: { qr: string; nfc: string; payment: string; share: string; contact: string };
  activity?: Array<{ id: string; kind: string; createdAt: string }>;
  nextCursor?: string | null;
};

type Metric = {
  key: string;
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
};

type Stage = {
  id: string;
  label: string;
  items: Metric[];
};

function useCountUp(value: number, play: boolean) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!play || reduceMotion) {
      setShown(value);
      return;
    }
    const startAt = performance.now();
    const duration = 720;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(value * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [play, reduceMotion, value]);

  return shown;
}

function MetricTile({
  metric,
  max,
  delay,
  reduceMotion,
  wide = false,
}: {
  metric: Metric;
  max: number;
  delay: number;
  reduceMotion: boolean | null;
  wide?: boolean;
}) {
  const count = useCountUp(metric.value, true);
  const Icon = metric.icon;
  const weight = max > 0 ? Math.max(0.08, metric.value / max) : 0.08;

  return (
    <motion.div
      className={`${styles.tile} ${wide ? "col-span-2" : ""}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-2">
        <dt className="text-[11px] font-medium leading-tight text-slate-500">{metric.label}</dt>
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#0B8A83]" aria-hidden />
      </div>
      <dd className="mt-0.5 text-base font-semibold tabular-nums tracking-tight text-slate-900">{count}</dd>
      <span className={styles.tileBar} style={{ transform: `scaleX(${weight})` }} aria-hidden />
    </motion.div>
  );
}

export function DigitalCardAnalyticsPanel({ cardId }: { cardId: string | null }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<ActivityDateRange>(defaultActivityRange);
  const [switching, setSwitching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const reduceMotion = useReducedMotion();
  const views = useCountUp(data?.viewCount ?? 0, Boolean(data) && !switching);
  const rangeQuery = activityRangeQuery(range);

  useEffect(() => {
    if (!cardId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setSwitching(true);
    async function load(isPoll = false) {
      try {
        if (!isPoll) setSwitching(true);
        const res = await fetch(`/api/digital-business-cards/${cardId}/analytics${rangeQuery}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load analytics");
          setSwitching(false);
          return;
        }
        setError(null);
        setData(json.data as Analytics);
        setSwitching(false);
      } catch {
        if (!cancelled) {
          setError("Could not load analytics");
          setSwitching(false);
        }
      }
    }
    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    }, 30000);
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [cardId, rangeQuery]);

  async function loadMore() {
    if (!cardId || !data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    const join = rangeQuery ? `${rangeQuery}&` : "?";
    const res = await fetch(
      `/api/digital-business-cards/${cardId}/analytics${join}cursor=${encodeURIComponent(data.nextCursor)}`,
      { cache: "no-store" }
    );
    const json = await res.json().catch(() => ({}));
    setLoadingMore(false);
    if (!res.ok || !json.data) return;
    const page = json.data as Analytics;
    setData((current) =>
      current
        ? {
            ...current,
            activity: [...(current.activity ?? []), ...(page.activity ?? [])],
            nextCursor: page.nextCursor ?? null,
          }
        : current
    );
  }

  const stages: Stage[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "arrive",
        label: "Arrive",
        items: [
          { key: "qr", label: "QR opens", value: data.qrOpens ?? 0, icon: QrCode },
          { key: "nfc", label: "NFC taps", value: data.nfcTaps ?? 0, icon: Nfc },
          { key: "save", label: "Save contact", value: data.vcardSaves ?? 0, icon: Contact },
          { key: "vcf", label: "vCard downloads", value: data.vcardDownloads ?? 0, icon: Contact },
        ],
      },
      {
        id: "reach",
        label: "Reach",
        items: [
          { key: "call", label: "Calls", value: data.callTaps ?? 0, icon: Phone },
          { key: "wa", label: "WhatsApp", value: data.whatsappTaps ?? 0, icon: MessageCircle },
          { key: "email", label: "Email", value: data.emailTaps ?? 0, icon: Mail },
          { key: "web", label: "Website", value: data.websiteTaps ?? 0, icon: Globe },
          { key: "social", label: "Social", value: data.socialTaps ?? 0, icon: Share2 },
          { key: "place", label: "Location", value: data.locationTaps ?? 0, icon: MapPin },
        ],
      },
      {
        id: "pass",
        label: "Pass on",
        items: [
          { key: "share", label: "Share started", value: data.shares ?? 0, icon: Share2 },
          { key: "connect", label: "Connections", value: data.connects ?? 0, icon: Users },
          { key: "meet", label: "Booking opened", value: data.meetingOpens ?? 0, icon: CalendarClock },
          { key: "booked", label: "Meetings requested", value: data.meetingBooked ?? 0, icon: CalendarClock },
          { key: "pay", label: "Payment details", value: data.paymentOpens ?? 0, icon: CreditCard },
        ],
      },
    ];
  }, [data]);

  const peak = useMemo(() => {
    const values = stages.flatMap((stage) => stage.items.map((item) => item.value));
    return Math.max(1, data?.viewCount ?? 0, ...values);
  }, [data?.viewCount, stages]);

  if (!cardId) return null;

  return (
    <section
      id="studio-activity"
      className={`${styles.panel} ${reduceMotion ? styles.static : ""} scroll-mt-16`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Activity</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Live counts from people who open this CeleYou and use published actions. Taps are not completed payments or sent messages.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#0B8A83]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0B8A83]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0B8A83]" aria-hidden />
          Live
        </span>
      </div>
      <DigitalCardActivityRange value={range} onChange={setRange} />

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {!data && !error ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <p className="text-xs text-slate-500">Loading activity…</p>
        </div>
      ) : null}

      {data ? (
        <div
          key={rangeQuery || "all"}
          className="mt-3 space-y-2.5"
          aria-busy={switching}
          style={switching ? { opacity: 0.55 } : undefined}
        >
          <motion.div
            className={styles.hero}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.rings} aria-hidden>
              <span className={styles.ring} />
              <span className={styles.ring} />
              <span className={styles.ring} />
            </div>
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Profile views
            </p>
            <p className="relative mt-1 text-3xl font-semibold tabular-nums leading-none tracking-tight">{views}</p>
            <p className="relative mt-1.5 text-[11px] text-white/70">{formatActivityHeroCaption(range)}</p>
          </motion.div>

          {data.trend?.length ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Engagement trend</p>
              <DigitalCardAnalyticsChart points={data.trend} />
            </div>
          ) : null}

          {stages.map((stage, stageIndex) => (
            <div key={stage.id} className={styles.stage}>
              <p className={styles.stageLabel}>
                <span>{stage.label}</span>
                <span className={styles.rail} aria-hidden>
                  <span className={styles.railFill} />
                </span>
              </p>
              <dl className="grid grid-cols-2 gap-1.5">
                {stage.items.map((metric, itemIndex) => (
                  <MetricTile
                    key={metric.key}
                    metric={metric}
                    max={peak}
                    delay={0.08 + stageIndex * 0.08 + itemIndex * 0.04}
                    reduceMotion={reduceMotion}
                    wide={stage.items.length % 2 === 1 && itemIndex === stage.items.length - 1}
                  />
                ))}
              </dl>
            </div>
          ))}

          {data.popular && data.popular.length ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Popular actions</p>
              <ol className="mt-1.5 space-y-1">
                {data.popular.slice(0, 6).map((row) => (
                  <li key={row.kind} className="flex items-center justify-between text-xs text-slate-700">
                    <span>
                      {row.label}
                      {row.outcome === "attempted" ? (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-400">attempted</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {data.devices ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Device mix</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Coarse categories from the browser family. Raw user agents are not stored.</p>
              <dl className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[11px] text-slate-600">
                {(["phone", "tablet", "desktop", "unknown"] as const).map((key) => (
                  <div key={key}>
                    <dt className="capitalize">{key}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{data.devices?.[key] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {data.notes ? (
            <p className="text-[10px] leading-relaxed text-slate-500">
              {data.notes.qr} {data.notes.nfc} {data.notes.contact} {data.notes.share} {data.notes.payment}
            </p>
          ) : null}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recent activity</p>
            <ul className="mt-1.5 space-y-1">
              {(data.activity ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span>{celeYouActivityLabel(row.kind)}</span>
                  <time className="tabular-nums text-slate-400">
                    {new Date(row.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
              {!(data.activity ?? []).length ? (
                <li className="text-xs text-slate-500">No published actions in this window.</li>
              ) : null}
            </ul>
            {data.nextCursor ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[#0B8A83]"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
