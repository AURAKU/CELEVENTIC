"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Calendar, Ticket, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_TAGLINE } from "@/lib/constants";
import { BrandMotto } from "@/components/brand/brand-motto";

const HeroScene = dynamic(() => import("@/components/landing/hero-scene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
});

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white">
      <HeroScene />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl animate-shimmer" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6 lg:px-8 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <BrandMotto size="lg" variant="hero" className="mb-4 sm:mb-6" />
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
              The Intelligent{" "}
              <span className="text-gradient-gold">Event</span>{" "}
              Operating System
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-lg leading-relaxed">
              {APP_TAGLINE}. Plan events, create stunning invitations, sell tickets, manage guests, scan QR codes, and preserve memories — all in one premium platform.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/register">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm"
                asChild
              >
                <Link href="#how-it-works">
                  <Play className="h-4 w-4" /> See How It Works
                </Link>
              </Button>
            </div>
            <div className="mt-10 sm:mt-14 flex flex-wrap gap-4 sm:gap-8">
              {[
                { icon: Calendar, label: "10K+ Events" },
                { icon: Ticket, label: "50K+ Tickets" },
                { icon: QrCode, label: "1M+ QR Scans" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                    <stat.icon className="h-5 w-5 text-gold-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl glass-dark border border-white/15 p-6 shadow-2xl animate-float">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Live Dashboard</span>
                    <span className="badge-pill bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["Events", "Invitations", "Tickets", "Revenue"].map((item, i) => (
                      <div
                        key={item}
                        className="rounded-xl bg-white/8 border border-white/10 p-4 hover:bg-white/12 transition-colors"
                      >
                        <p className="text-xs text-slate-400 font-medium">{item}</p>
                        <p className="font-display text-2xl font-bold mt-1 text-white">
                          {[12, 48, 156, "₵24K"][i]}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-gradient-to-r from-brand-600/30 to-accent-500/20 border border-white/10 p-5 h-36 flex items-end">
                    <div className="flex items-end gap-2 h-20 w-full">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 opacity-80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
