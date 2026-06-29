"use client";

import Link from "next/link";
import { ArrowRight, Crown, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";

const FEATURED_LAYOUT = "royal-emerald-wedding";

export function ExperienceReimaginedHero() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(212,175,55,0.12)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 grid-pattern opacity-[0.03]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="mb-6 bg-amber-500/10 text-amber-300 border-amber-500/30">
              <Crown className="h-3.5 w-3.5 mr-1" />
              Experience Engine V2
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Invitations <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-teal-300">Reimagined</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Not just an invitation — it&apos;s an experience. Every template is its own cinematic universe.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              {["10+ unique templates with distinct intros & reveals", "Premium audio library with trim, loop & fade", "Full-screen immersive 100dvh guest experience", "RSVP, QR, seating, gallery & memory vault intact"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400">
                <Link href="/experience">Explore Experience Engine <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
                <Link href="/invitations/catalogue"><Play className="h-4 w-4 mr-1" /> Browse Templates</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-transparent to-teal-500/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <LiveTemplatePreview layoutSlug={FEATURED_LAYOUT} category="Wedding" variant="hero" showDeviceToggle />
            </div>
            <p className="text-center text-xs text-slate-500 mt-3">Tap to begin the full cinematic experience</p>
          </div>
        </div>
      </div>
    </section>
  );
}
