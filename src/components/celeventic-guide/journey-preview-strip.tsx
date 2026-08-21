"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GUEST_JOURNEY_STAGES,
  PLATFORM_CAPABILITIES,
  PLATFORM_LANES,
  type PlatformLaneId,
} from "@/lib/celeventic-guide/platform-journey";

function StageMotion({ motionKey }: { motionKey: string }) {
  const reduce = useReducedMotion();
  const key = motionKey.toLowerCase();

  if (key === "admit") {
    return (
      <motion.div
        className="relative mx-auto h-28 w-28 rounded-2xl border border-white/40 bg-white p-3 shadow-lg"
        animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        aria-hidden
      >
        <svg viewBox="0 0 40 40" className="h-full w-full text-slate-900">
          <rect x="2" y="2" width="12" height="12" fill="currentColor" />
          <rect x="26" y="2" width="12" height="12" fill="currentColor" />
          <rect x="2" y="26" width="12" height="12" fill="currentColor" />
          <rect x="18" y="18" width="4" height="4" fill="currentColor" />
          <rect x="24" y="18" width="4" height="4" fill="currentColor" />
          <rect x="18" y="24" width="4" height="4" fill="currentColor" />
          <rect x="30" y="24" width="6" height="6" fill="currentColor" />
          <rect x="24" y="30" width="4" height="4" fill="currentColor" />
        </svg>
        <motion.div
          className="absolute inset-x-2 h-0.5 bg-brand-500/80"
          animate={reduce ? undefined : { top: ["18%", "82%", "18%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    );
  }

  if (key === "guide" || key === "celebrate") {
    return (
      <motion.div
        className="relative mx-auto h-28 w-44 rounded-2xl border border-white/35 bg-white/10 backdrop-blur-sm p-3.5"
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        aria-hidden
      >
        <div className="h-2 w-20 rounded bg-amber-200/90 mb-3" />
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded bg-white/40" />
          <div className="h-1.5 w-4/5 rounded bg-white/30" />
          <div className="h-1.5 w-3/5 rounded bg-white/20" />
          <div className="mt-3 flex gap-1.5">
            <span className="h-6 flex-1 rounded-md bg-white/15" />
            <span className="h-6 flex-1 rounded-md bg-white/10" />
            <span className="h-6 flex-1 rounded-md bg-white/10" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (key === "remember") {
    return (
      <div className="relative mx-auto flex h-28 w-40 items-end justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-lg border border-white/30 bg-gradient-to-br from-white/25 to-white/5"
            style={{ width: 36 + i * 4, height: 48 + i * 8 }}
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="relative mx-auto h-32 w-20 rounded-[1.35rem] border-2 border-white/70 bg-slate-950/80 shadow-xl overflow-hidden"
      initial={reduce ? false : { y: 12, opacity: 0.75 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.45 }}
      aria-hidden
    >
      <div className="absolute top-2 inset-x-6 h-1 rounded-full bg-white/30" />
      <motion.div
        className="absolute inset-x-3 top-6 bottom-4 rounded-lg bg-gradient-to-br from-brand-400/45 to-amber-300/35"
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
    </motion.div>
  );
}

/**
 * Interactive platform explainer for landing + /guide.
 * Auto-plays the guest journey, then lets people explore host / door / vendor
 * lanes and the full capability map.
 */
export function JourneyPreviewStrip() {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lane, setLane] = useState<PlatformLaneId>("guest");

  const stage = GUEST_JOURNEY_STAGES[activeIndex] ?? GUEST_JOURNEY_STAGES[0];
  const activeLane = PLATFORM_LANES.find((l) => l.id === lane) ?? PLATFORM_LANES[0];

  useEffect(() => {
    if (!playing || reduce) return;
    const t = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % GUEST_JOURNEY_STAGES.length);
    }, stage.durationMs);
    return () => clearTimeout(t);
  }, [playing, reduce, stage.durationMs, activeIndex]);

  return (
    <section
      aria-label="How Celeventic works — full platform journey"
      className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-900 via-brand-700 to-slate-900 text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_18%_0%,rgba(212,166,58,0.4),transparent_42%),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.08),transparent_40%)]"
        aria-hidden
      />

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 space-y-10">
        {/* Hero + journey rail */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="max-w-md space-y-4 shrink-0">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-100/90">Celeventic Guide</p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">
              See How Celeventic Works
            </h2>
            <p className="text-sm text-white/75 leading-relaxed">
              One operating system for celebrations: invitations, RSVP, QR admission, Event Guide,
              gifts, vendors, and Memory Vault — explained in motion for guests, hosts, door staff,
              and vendors.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/guide/how-celeventic-works"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-900 px-4 py-2.5 text-sm font-semibold hover:bg-brand-50 transition"
              >
                Full walkthrough
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/guide"
                className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition"
              >
                Browse all guides
              </Link>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GUEST_JOURNEY_STAGES.map((item, i) => {
                const active = i === activeIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveIndex(i);
                        setPlaying(false);
                        setLane("guest");
                      }}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "w-full rounded-2xl border px-2 py-3 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80",
                        active
                          ? "border-amber-200/60 bg-white/20 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                          : "border-white/15 bg-white/10 hover:bg-white/15"
                      )}
                    >
                      <span className="block text-[10px] uppercase tracking-wider text-brand-100/80">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-1 block font-display text-sm font-semibold leading-tight">
                        {item.label}
                      </span>
                      {active && !reduce ? (
                        <motion.span
                          className="mt-2 mx-auto block h-0.5 w-8 rounded-full bg-amber-200"
                          layoutId="journey-active-rail"
                        />
                      ) : (
                        <span className="mt-2 mx-auto block h-0.5 w-8 rounded-full bg-transparent" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                <div className="sm:w-44 shrink-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stage.id}
                      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={{ duration: reduce ? 0 : 0.35 }}
                    >
                      <StageMotion motionKey={stage.motionKey} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="min-w-0 flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stage.id + "-copy"}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: reduce ? 0 : 0.35 }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100/90">
                        Guest path · Step {activeIndex + 1} of {GUEST_JOURNEY_STAGES.length}
                      </p>
                      <h3 className="mt-1.5 font-display text-xl sm:text-2xl font-semibold">
                        {stage.headline}
                      </h3>
                      <p className="mt-2 text-sm text-white/75 leading-relaxed">{stage.summary}</p>
                      <ul className="mt-3 space-y-1.5 text-sm text-white/85">
                        {stage.details.map((line) => (
                          <li key={line} className="flex gap-2 leading-snug">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-200" aria-hidden />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={stage.guideHref}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-100 hover:text-white"
                      >
                        Learn this step
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                    aria-label={playing ? "Pause journey" : "Play journey"}
                    onClick={() => setPlaying((p) => !p)}
                  >
                    {playing && !reduce ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                    aria-label="Replay from Invite"
                    onClick={() => {
                      setActiveIndex(0);
                      setPlaying(true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-1 flex-1 max-w-[12rem] rounded-full bg-white/15 overflow-hidden" aria-hidden>
                  <div
                    className="h-full bg-amber-200/90 transition-[width] duration-300"
                    style={{
                      width: `${((activeIndex + 1) / GUEST_JOURNEY_STAGES.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-white/55 tabular-nums" aria-live="polite">
                  {activeIndex + 1}/{GUEST_JOURNEY_STAGES.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role lanes */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Who uses Celeventic</h3>
              <p className="mt-1 text-sm text-white/65">
                The same event, four operating views — tap a lane to see how that role works.
              </p>
            </div>
            <div
              className="flex flex-wrap gap-1.5 rounded-xl border border-white/15 bg-black/20 p-1"
              role="tablist"
              aria-label="Platform role"
            >
              {PLATFORM_LANES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={lane === item.id}
                  onClick={() => setLane(item.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                    lane === item.id
                      ? "bg-white text-brand-900"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeLane.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              className="rounded-2xl border border-white/15 bg-white/10 p-5 sm:p-6"
              role="tabpanel"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="max-w-2xl">
                  <h4 className="font-display text-xl font-semibold">{activeLane.title}</h4>
                  <p className="mt-1.5 text-sm text-white/70 leading-relaxed">{activeLane.summary}</p>
                </div>
                <Link
                  href={activeLane.guideHref}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-amber-100 hover:text-white"
                >
                  Open guide
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeLane.steps.map((step, i) => (
                  <li
                    key={step.title}
                    className="rounded-xl border border-white/10 bg-black/15 px-3.5 py-3"
                  >
                    <span className="text-[10px] uppercase tracking-[0.18em] text-brand-100/80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 font-semibold text-sm">{step.title}</p>
                    <p className="mt-1 text-xs text-white/65 leading-relaxed">{step.body}</p>
                  </li>
                ))}
              </ol>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Full system map */}
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Everything in the system</h3>
            <p className="mt-1 text-sm text-white/65 max-w-2xl">
              From first invite to Memory Vault — every major Celeventic surface, with a deep-dive
              guide for each.
            </p>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CAPABILITIES.map((cap, i) => (
              <motion.li
                key={cap.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.24), duration: 0.3 }}
              >
                <Link
                  href={cap.guideHref}
                  className="block h-full rounded-xl border border-white/12 bg-black/15 px-3.5 py-3 transition hover:border-amber-200/35 hover:bg-white/10"
                >
                  <p className="font-semibold text-sm">{cap.label}</p>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">{cap.body}</p>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
