"use client";

import { useMemo, useState } from "react";
import { Palette, Sparkles, Type, MousePointer, Layout, Music, Layers, Wind } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  BUTTON_STYLE_OPTIONS,
  BUTTON_POSITION_OPTIONS,
  DEFAULT_STUDIO_CONFIG,
} from "@/lib/invitation-studio/studio-types";
import type { EventExperienceConfig, HubTabId, OpeningExperienceId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { OPENING_EXPERIENCES, mapLegacyRevealMode, mapOpeningToLegacyRevealMode } from "@/lib/experience/opening-experiences";
import { ENVIRONMENT_PRESETS } from "@/lib/experience/environment-presets";
import { INTRO_DURATION_OPTIONS } from "@/lib/experience/celeventic-palette";
import { HUB_TAB_LABELS } from "@/components/experience/event-experience-hub";
import { EXPERIENCE_THEME_PRESETS } from "@/lib/experience/theme-presets";
const FONT_OPTIONS = ["Inter", "Playfair Display", "Cinzel", "Cormorant Garamond", "Great Vibes"];
const ALL_HUB_TABS = Object.keys(HUB_TAB_LABELS) as HubTabId[];
const OPENING_CATEGORIES = ["envelope", "curtain", "palace", "interactive", "instant"] as const;

interface InvitationStudioHubProps {
  design: InvitationDesignConfig;
  event: {
    title: string;
    hostName: string;
    description?: string | null;
    startDate: string;
    venueName?: string | null;
    landmark?: string | null;
    mapsLink?: string | null;
    contactPhone?: string | null;
    dressCode?: string | null;
  };
  message?: string;
  onChange: (design: InvitationDesignConfig) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

export function InvitationStudioHub({ design, event, message, onChange, onSave, saving }: InvitationStudioHubProps) {
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const studio = design.studio ?? DEFAULT_STUDIO_CONFIG;
  const experience = design.experience ?? {};

  function patchDesign(patch: Partial<InvitationDesignConfig>) {
    onChange({ ...design, ...patch });
  }

  function patchStudio(patch: Partial<typeof studio>) {
    onChange({ ...design, studio: { ...studio, ...patch } });
  }

  function patchExperience(patch: Partial<EventExperienceConfig>) {
    onChange({ ...design, experience: { ...experience, ...patch } });
  }

  function setOpeningExperience(id: OpeningExperienceId) {
    onChange({
      ...design,
      experience: { ...experience, openingExperience: id },
      studio: { ...studio, revealMode: mapOpeningToLegacyRevealMode(id) },
    });
  }

  function toggleHubTab(tab: HubTabId) {
    const current = experience.enabledTabs ?? DEFAULT_HUB_TABS;
    const next = current.includes(tab)
      ? current.filter((t) => t !== tab)
      : [...current, tab];
    patchExperience({ enabledTabs: next.length > 0 ? next : ["invitation"] });
  }

  const activeOpening =
    experience.openingExperience ??
    mapLegacyRevealMode(studio.revealMode ?? "envelope");

  function patchColors(key: keyof InvitationDesignConfig["colors"], value: string) {
    onChange({ ...design, colors: { ...design.colors, [key]: value } });
  }

  function applyPreset(slug: string) {
    const preset = INVITATION_TEMPLATE_PRESETS.find((p) => p.slug === slug);
    if (preset) onChange({ ...preset.config, media: design.media, studio: { ...DEFAULT_STUDIO_CONFIG, ...preset.config.studio, ...design.studio } });
  }

  const previewDesign = useMemo(() => design, [design]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Layout className="h-4 w-4 text-[#0B8A83]" /> Template & reveal
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {INVITATION_TEMPLATE_PRESETS.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => applyPreset(p.slug)}
                className={`rounded-xl border p-3 text-left transition-all hover:border-[#0B8A83] ${
                  design.layout === p.slug ? "border-[#0B8A83] bg-[#0B8A83]/5 ring-1 ring-[#0B8A83]" : "border-slate-200"
                }`}
              >
                <div className={`h-10 rounded-lg bg-gradient-to-br ${p.preview.gradient} mb-2`} />
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label>Opening experience</Label>
            <Select value={activeOpening} onValueChange={(v) => setOpeningExperience(v as OpeningExperienceId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {OPENING_CATEGORIES.map((cat) => {
                  const items = OPENING_EXPERIENCES.filter((e) => e.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {cat}
                      </p>
                      {items.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {OPENING_EXPERIENCES.find((o) => o.id === activeOpening)?.description}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Sparkles className="h-4 w-4 text-[#D4A63A]" /> Experience theme
          </h3>
          <div className="space-y-1">
            <Label>One-click theme generator</Label>
            <Select
              value={experience.themePresetId ?? ""}
              onValueChange={(v) => {
                const preset = EXPERIENCE_THEME_PRESETS.find((p) => p.id === v);
                if (!preset) return;
                onChange({
                  ...design,
                  colors: preset.colors,
                  experience: {
                    ...experience,
                    ...preset.experience,
                    themePresetId: preset.id,
                    openingExperience: preset.openingExperience,
                  },
                  studio: { ...studio, revealMode: mapOpeningToLegacyRevealMode(preset.openingExperience) },
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Choose a theme…" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_THEME_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Applies colors, opening, particles, and countdown automatically</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Sparkles className="h-4 w-4 text-[#0B8A83]" /> Cinematic intro
          </h3>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={experience.introEnabled ?? true}
              onChange={(e) => patchExperience({ introEnabled: e.target.checked })}
              className="rounded border-slate-300"
            />
            Show Celeventic logo intro before invitation
          </label>
          <div className="space-y-1">
            <Label>Intro duration</Label>
            <Select
              value={String(experience.introDurationSec ?? 3)}
              onValueChange={(v) =>
                patchExperience({ introDurationSec: parseFloat(v) as EventExperienceConfig["introDurationSec"] })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTRO_DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} seconds</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Wind className="h-4 w-4 text-[#0B8A83]" /> Living environment
          </h3>
          <div className="space-y-1">
            <Label>Particle environment</Label>
            <Select
              value={experience.environment ?? "none"}
              onValueChange={(v) => patchExperience({ environment: v as EventExperienceConfig["environment"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Particle density</Label>
            <Select
              value={experience.environmentIntensity ?? "medium"}
              onValueChange={(v) => patchExperience({ environmentIntensity: v as EventExperienceConfig["environmentIntensity"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hub navigation</Label>
              <Select
                value={experience.hubMode ?? "scroll"}
                onValueChange={(v) => patchExperience({ hubMode: v as EventExperienceConfig["hubMode"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scroll">Scroll with tabs</SelectItem>
                  <SelectItem value="tabs">Tab sections</SelectItem>
                  <SelectItem value="journey">Chapter journey</SelectItem>
                  <SelectItem value="storybook">AI storybook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Countdown style</Label>
              <Select
                value={experience.countdownStyle ?? "classic"}
                onValueChange={(v) => patchExperience({ countdownStyle: v as EventExperienceConfig["countdownStyle"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="flip">Flip clock</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="ring">Countdown ring</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="gold-royal">Gold royal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Experience hub tabs
            </Label>
            <div className="flex flex-wrap gap-2">
              {ALL_HUB_TABS.map((tab) => {
                const enabled = (experience.enabledTabs ?? DEFAULT_HUB_TABS).includes(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => toggleHubTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      enabled
                        ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {HUB_TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4 text-[#0B8A83]" /> Colors</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["primary", "secondary", "accent", "background", "text"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs capitalize">{key}</Label>
                <div className="flex gap-2">
                  <input type="color" value={design.colors[key]} onChange={(e) => patchColors(key, e.target.value)} className="h-9 w-10 rounded cursor-pointer" />
                  <Input value={design.colors[key]} onChange={(e) => patchColors(key, e.target.value)} className="flex-1 text-xs" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Type className="h-4 w-4 text-[#0B8A83]" /> Typography</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {(["heading", "script", "body"] as const).map((role) => (
              <div key={role} className="space-y-1">
                <Label className="text-xs capitalize">{role}</Label>
                <Select value={design.fonts?.[role] ?? "Inter"} onValueChange={(v) => onChange({ ...design, fonts: { ...design.fonts, [role]: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Heading size</Label><Input type="number" value={studio.headingSize ?? 28} onChange={(e) => patchStudio({ headingSize: parseInt(e.target.value) })} /></div>
            <div><Label className="text-xs">Script size</Label><Input type="number" value={studio.scriptSize ?? 22} onChange={(e) => patchStudio({ scriptSize: parseInt(e.target.value) })} /></div>
            <div><Label className="text-xs">Body size</Label><Input type="number" value={studio.bodySize ?? 14} onChange={(e) => patchStudio({ bodySize: parseInt(e.target.value) })} /></div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><MousePointer className="h-4 w-4 text-[#0B8A83]" /> Buttons & RSVP</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Button style</Label>
              <Select value={studio.buttonStyle ?? "gold"} onValueChange={(v) => patchStudio({ buttonStyle: v as typeof studio.buttonStyle })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUTTON_STYLE_OPTIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Button position</Label>
              <Select value={studio.buttonPosition ?? "center"} onValueChange={(v) => patchStudio({ buttonPosition: v as typeof studio.buttonPosition })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUTTON_POSITION_OPTIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>RSVP button label</Label>
            <Input value={studio.rsvpLabel ?? "RSVP Now"} onChange={(e) => patchStudio({ rsvpLabel: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Intro line</Label>
            <Input value={design.introText ?? ""} onChange={(e) => patchDesign({ introText: e.target.value })} placeholder="Together with their families" />
          </div>
        </section>

        {onSave && (
          <Button className="w-full bg-[#0B8A83] hover:bg-[#097068]" size="lg" onClick={() => void onSave()} disabled={saving}>
            <Sparkles className="h-4 w-4" /> {saving ? "Saving…" : "Save studio design"}
          </Button>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
        <div className="flex justify-center gap-2">
          <Button size="sm" variant={view === "mobile" ? "default" : "outline"} onClick={() => setView("mobile")}>Mobile</Button>
          <Button size="sm" variant={view === "desktop" ? "default" : "outline"} onClick={() => setView("desktop")}>Desktop</Button>
        </div>
        <div className={`mx-auto transition-all rounded-2xl border shadow-xl overflow-hidden ${view === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
          <InvitationStudioPreview design={previewDesign} event={event} message={message ?? ""} invitationName={event.title} />
        </div>
        <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
          <Music className="h-3 w-3" /> Audio plays after the reveal ceremony on the live invite
        </p>
      </div>
    </div>
  );
}
