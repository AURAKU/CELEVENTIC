"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import Link from "next/link";

const STAGES = [
  { id: "invite", label: "Invite" },
  { id: "rsvp", label: "RSVP" },
  { id: "admit", label: "Admit" },
  { id: "guide", label: "Guide" },
  { id: "celebrate", label: "Celebrate" },
  { id: "remember", label: "Remember" },
] as const;

export function JourneyPreviewStrip() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="How Celeventic works journey preview"
      className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-900 via-brand-700 to-slate-900 text-white px-5 py-8 sm:px-8"
    >
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_0%,rgba(212,166,58,0.35),transparent_45%)]" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
        <div className="max-w-md space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-100/90">Celeventic Guide</p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">
            See How Celeventic Works
          </h2>
          <p className="text-sm text-white/75 leading-relaxed">
            Invite → RSVP → Admit → Guide → Celebrate → Remember — learn the journey in motion.
          </p>
          <Link
            href="/guide/how-celeventic-works"
            className="inline-flex items-center rounded-xl bg-white text-brand-900 px-4 py-2.5 text-sm font-semibold hover:bg-brand-50 transition"
          >
            See How It Works
          </Link>
        </div>
        <div className="flex-1 overflow-x-auto pb-1">
          <ol className="flex min-w-max gap-3">
            {STAGES.map((stage, i) => (
              <li key={stage.id}>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.35 }}
                  className="w-28 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm px-3 py-4 text-center"
                >
                  <span className="text-[10px] uppercase tracking-wider text-brand-100/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 font-display font-semibold">{stage.label}</p>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
