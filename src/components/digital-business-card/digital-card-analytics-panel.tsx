"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Contact,
  Globe,
  Mail,
  MessageCircle,
  Nfc,
  Phone,
  QrCode,
  Share2,
  Users,
} from "lucide-react";
import styles from "./digital-card-analytics-panel.module.css";

type Analytics = {
  viewCount: number;
  qrOpens: number;
  nfcTaps: number;
  vcardSaves: number;
  callTaps: number;
  whatsappTaps: number;
  emailTaps?: number;
  websiteTaps: number;
  shares: number;
  connects: number;
  reconnects: number;
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
  const reduceMotion = useReducedMotion();
  const views = useCountUp(data?.viewCount ?? 0, Boolean(data));

  useEffect(() => {
    if (!cardId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/digital-business-cards/${cardId}/analytics`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load analytics");
          return;
        }
        setData(json.data as Analytics);
      } catch {
        if (!cancelled) setError("Could not load analytics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const stages: Stage[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "arrive",
        label: "Arrive",
        items: [
          { key: "qr", label: "QR opens", value: data.qrOpens, icon: QrCode },
          { key: "nfc", label: "NFC taps", value: data.nfcTaps, icon: Nfc },
          { key: "save", label: "Save contact", value: data.vcardSaves, icon: Contact },
        ],
      },
      {
        id: "reach",
        label: "Reach",
        items: [
          { key: "call", label: "Calls", value: data.callTaps, icon: Phone },
          { key: "wa", label: "WhatsApp", value: data.whatsappTaps, icon: MessageCircle },
          { key: "email", label: "Email", value: data.emailTaps ?? 0, icon: Mail },
          { key: "web", label: "Website", value: data.websiteTaps, icon: Globe },
        ],
      },
      {
        id: "pass",
        label: "Pass on",
        items: [
          { key: "share", label: "Shares", value: data.shares, icon: Share2 },
          { key: "connect", label: "Connections", value: data.connects + data.reconnects, icon: Users },
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
    <section className={`${styles.panel} ${reduceMotion ? styles.static : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Activity</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Public opens and published actions. These counts are not the recipient’s identity.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#0B8A83]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0B8A83]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0B8A83]" aria-hidden />
          Live
        </span>
      </div>

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
        <div className="mt-3 space-y-2.5">
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
            <p className="relative mt-1.5 text-[11px] text-white/70">People opened this public profile.</p>
          </motion.div>

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
        </div>
      ) : null}
    </section>
  );
}
