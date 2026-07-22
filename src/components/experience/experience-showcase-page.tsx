"use client";

import Link from "next/link";
import { ArrowRight, Crown, Music2, Sparkles, Wand2, Layers, Type, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import { CINEMATIC_SHOWCASE } from "@/lib/experience/experience-showcase";
import { SHOWCASE_REVEAL_EFFECTS } from "@/lib/experience/reveal-effects-registry";
import { AUDIO_CATEGORY_GROUPS, AUDIO_EXPERIENCE_CATALOG } from "@/lib/music/audio-experience-catalog";
import { BUTTON_STYLE_OPTIONS } from "@/lib/invitation-studio/studio-types";
import { SLIDESHOW_STYLE_OPTIONS } from "@/lib/invitation/slideshow-styles";
import { TYPOGRAPHY_PACKS } from "@/lib/experience/typography-engine";
import { BACKGROUND_PACKS } from "@/lib/experience/background-engine";
import { EXPERIENCE_COLLECTIONS } from "@/lib/experience/experience-engine-v2";

export function ExperienceShowcasePage() {
  const audioPreview = AUDIO_EXPERIENCE_CATALOG.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.15)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 grid-pattern opacity-5" />
        <div className="relative mx-auto max-w-6xl text-center">
          <Badge className="mb-6 bg-amber-500/10 text-amber-300 border-amber-500/30">
            <Crown className="h-3.5 w-3.5 mr-1" />
            Experience Engine V2
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Invitations <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-teal-300">Reimagined</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            Not just an invitation — it&apos;s an experience. Every template is its own cinematic universe with unique intro, reveal, audio, typography, and pacing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
            {["10+ Unique Templates", "Cinematic Intros", "Premium Audio", "Full Screen Immersive", "Interactive Reveals", "RSVP · QR · Ticketing"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 px-3 py-1 bg-white/5">{item}</span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold">
              <Link href="/invitations/catalogue">Browse Templates <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
              <Link href="/dashboard">Create Invitation</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 10 Cinematic Templates */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-400/80">Template Diversity</span>
          </div>
          <h2 className="font-display text-3xl font-bold mb-2">10 Unique Cinematic Templates</h2>
          <p className="text-slate-400 mb-10 max-w-2xl">Each template belongs to a completely different creative universe — no recolored copies.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CINEMATIC_SHOWCASE.map((item) => (
              <article
                key={item.slug}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-500/40 hover:shadow-[0_0_40px_rgba(212,175,55,0.12)] transition-all"
              >
                <div className="relative">
                  <LiveTemplatePreview layoutSlug={item.slug} category={item.category} variant="card" />
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300 z-10">
                    {item.index}
                  </div>
                </div>
                <Link
                  href={`/templates?layout=${item.slug}`}
                  className="block p-4 space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
                >
                  <p className="font-semibold text-sm leading-tight group-hover:text-amber-200 transition-colors">{item.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{item.category}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{item.introLabel.split(" ")[0]} Intro</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 truncate max-w-full">{item.audioLabel}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Reveal Effects */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="h-5 w-5 text-indigo-400" />
            <span className="text-xs uppercase tracking-widest text-indigo-400/80">Powerful Reveal Effects</span>
          </div>
          <h2 className="font-display text-3xl font-bold mb-10">Every Template Gets One Unique Reveal</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SHOWCASE_REVEAL_EFFECTS.map((effect) => (
              <div
                key={effect.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-center hover:border-indigo-400/40 transition-colors"
              >
                <div
                  className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3"
                  style={{ background: `${effect.accent}22`, color: effect.accent }}
                >
                  {effect.icon}
                </div>
                <p className="font-medium text-sm">{effect.label}</p>
                <p className="text-[11px] text-slate-500 mt-1">{effect.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audio Library */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="h-5 w-5 text-teal-400" />
            <span className="text-xs uppercase tracking-widest text-teal-400/80">Premium Audio Engine</span>
          </div>
          <h2 className="font-display text-3xl font-bold mb-2">Rich Audio Library</h2>
          <p className="text-slate-400 mb-8">Upload, trim, loop, fade, and preview — admin manages everything.</p>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Categories</p>
              {AUDIO_CATEGORY_GROUPS.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm">{cat.label}</span>
                  <span className="text-xs text-slate-500">{cat.moods.join(" · ")}</span>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-4">Featured Tracks</p>
              <div className="space-y-2">
                {audioPreview.map((track) => (
                  <div key={track.id} className="flex items-center gap-3 rounded-lg bg-black/30 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                      <Music2 className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{track.category}</p>
                    </div>
                    <div className="hidden sm:flex gap-0.5 items-end h-4">
                      {[3, 5, 4, 7, 3, 6, 4].map((h, i) => (
                        <div key={i} className="w-1 rounded-full bg-teal-500/50" style={{ height: `${h * 3}px` }} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{track.durationSec}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Button + Slideshow */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-10">
          <div>
            <h3 className="font-display text-xl font-bold mb-4">Premium Button Styles</h3>
            <div className="flex flex-wrap gap-2">
              {BUTTON_STYLE_OPTIONS.map((btn) => (
                <span key={btn.id} className="text-xs px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200">
                  {btn.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold mb-4">Slideshow Engine</h3>
            <div className="flex flex-wrap gap-2">
              {SLIDESHOW_STYLE_OPTIONS.map((s) => (
                <span key={s.id} className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Typography + Background + Collections */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-amber-950/10 to-transparent">
        <div className="mx-auto max-w-7xl space-y-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-5 w-5 text-rose-400" />
              <h3 className="font-display text-xl font-bold">Typography Engine</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TYPOGRAPHY_PACKS.slice(0, 8).map((pack) => (
                <div key={pack.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-sm">{pack.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{pack.heading} · {pack.script}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-sky-400" />
              <h3 className="font-display text-xl font-bold">Background Engine</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {BACKGROUND_PACKS.slice(0, 12).map((bg) => (
                <div key={bg.id} className="rounded-lg overflow-hidden border border-white/10 aspect-square relative">
                  <div className="absolute inset-0" style={{ background: bg.preview }} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1">
                    <p className="text-[10px] truncate">{bg.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-violet-400" />
              <h3 className="font-display text-xl font-bold">Experience Collections</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EXPERIENCE_COLLECTIONS).slice(0, 16).map(([id, col]) => (
                <span key={id} className="text-xs px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200">
                  {col.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Create. Invite. Celebrate. Remember Forever.
          </h2>
          <p className="text-slate-400 mb-8">Every invitation tells a story — beginning, build-up, emotion, reveal, celebration, and outro.</p>
          <Button size="lg" asChild className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-500 text-white font-semibold px-10">
            <Link href="/dashboard">Start Creating</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
