"use client";

import { useEffect, useMemo, useState } from "react";
import { Palette, Sparkles, Type, MousePointer, Layout, Music, Layers, Wind } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import { getUniqueTemplatePresets } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  BUTTON_STYLE_OPTIONS,
  BUTTON_POSITION_OPTIONS,
  DEFAULT_STUDIO_CONFIG,
} from "@/lib/invitation-studio/studio-types";
import type { EventExperienceConfig, HubTabId, OpeningExperienceId, OutroExperienceId, SceneTransitionId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { OPENING_EXPERIENCES, mapLegacyRevealMode, mapOpeningToLegacyRevealMode } from "@/lib/experience/opening-experiences";
import { ENVIRONMENT_PRESETS } from "@/lib/experience/environment-presets";
import { INTRO_DURATION_OPTIONS } from "@/lib/experience/celeventic-palette";
import { SLIDESHOW_STYLE_OPTIONS } from "@/lib/invitation/slideshow-styles";
import type { SlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import { EXTENDED_BUTTON_STYLES } from "@/lib/invitation/invitation-button-styles";
import { HUB_TAB_LABELS } from "@/components/experience/event-experience-hub";
import { EXPERIENCE_THEME_PRESETS } from "@/lib/experience/theme-presets";
import { enrichDesignWithExperienceDNA, getExperienceCollectionsList, getTemplateExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { TemplateStudioMediaPanel } from "@/components/invitation-studio/template-studio-media-panel";
import { CanvaInspirationPanel } from "@/components/invitation-studio/canva-inspiration-panel";
import { MusicPreferenceEditor } from "@/components/music/music-preference-editor";
import type { MusicSelection } from "@/lib/music/music-types";
import { TYPOGRAPHY_PACKS, getTypographyPack, type TypographyCategoryId } from "@/lib/experience/typography-engine";
import { BACKGROUND_PACKS, getBackgroundPack, type BackgroundTypeId } from "@/lib/experience/background-engine";
import type { HeroLayoutId, ExperiencePacing } from "@/lib/experience/experience-types";
import type { InvitationFeatureFlags } from "@/lib/invitation/admin-feature-flags";
import { DEFAULT_INVITATION_FEATURE_FLAGS } from "@/lib/invitation/admin-feature-flags";
import type { InvitationMediaLimits } from "@/lib/invitation/media-limits";
import { DEFAULT_INVITATION_MEDIA_LIMITS } from "@/lib/invitation/media-limits";

const ORNAMENT_OPTIONS = [
  { id: "gold-frame", label: "Gold frame" },
  { id: "vine", label: "Vine arch" },
  { id: "lace", label: "Lace overlay" },
  { id: "floral", label: "Floral border" },
  { id: "hexagon", label: "Hexagon frame" },
  { id: "none", label: "None" },
] as const;

const FONT_OPTIONS = ["Inter", "Playfair Display", "Cinzel", "Cormorant Garamond", "Great Vibes"];
const ALL_HUB_TABS = Object.keys(HUB_TAB_LABELS) as HubTabId[];
const OPENING_CATEGORIES = ["envelope", "curtain", "palace", "interactive", "instant"] as const;

const OUTRO_OPTIONS: { id: OutroExperienceId; label: string }[] = [
  { id: "thank-you-fade", label: "Thank you fade" },
  { id: "fireworks", label: "Fireworks" },
  { id: "lanterns", label: "Floating lanterns" },
  { id: "butterflies", label: "Butterflies" },
  { id: "rose-petals", label: "Rose petals" },
  { id: "golden-sparkles", label: "Golden sparkles" },
  { id: "closing-curtain", label: "Closing curtain" },
  { id: "memory-slideshow", label: "Memory slideshow" },
  { id: "final-quote", label: "Final quote" },
  { id: "see-you-soon", label: "See you soon" },
  { id: "upload-memories", label: "Upload memories" },
  { id: "none", label: "None" },
];

const SCENE_TRANSITIONS: { id: SceneTransitionId; label: string }[] = [
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "curtain", label: "Curtain" },
  { id: "door", label: "Door" },
  { id: "book", label: "Book page" },
  { id: "sparkle", label: "Sparkle" },
];

const PACING_OPTIONS: { id: ExperiencePacing; label: string }[] = [
  { id: "slow", label: "Slow · cinematic" },
  { id: "medium", label: "Medium · balanced" },
  { id: "fast", label: "Fast · energetic" },
];

function formatHeroLayoutLabel(id: HeroLayoutId): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const ANIMATION_OPTIONS = [
  { id: "fade", label: "Gentle fade" },
  { id: "ken-burns", label: "Ken Burns zoom" },
  { id: "parallax", label: "Parallax drift" },
  { id: "none", label: "Static" },
] as const;

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
  eventType?: string;
  musicSelection?: MusicSelection | null;
  onMusicChange?: (selection: MusicSelection | null) => void;
  galleryUrls?: string[];
  onGalleryChange?: (urls: string[]) => void;
  onChange: (design: InvitationDesignConfig) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

export function InvitationStudioHub({ design, event, message, eventType, musicSelection, onMusicChange, galleryUrls = [], onGalleryChange, onChange, onSave, saving }: InvitationStudioHubProps) {
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const [featureFlags, setFeatureFlags] = useState<InvitationFeatureFlags>(DEFAULT_INVITATION_FEATURE_FLAGS);
  const [mediaLimits, setMediaLimits] = useState<InvitationMediaLimits>(DEFAULT_INVITATION_MEDIA_LIMITS);
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
    onChange({
      ...design,
      colors: { ...design.colors, [key]: value },
      experience: { ...experience, experienceCustomized: true },
    });
  }

  useEffect(() => {
    fetch("/api/invitations/studio-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setFeatureFlags(d.data.flags);
          setMediaLimits(d.data.limits);
        }
      })
      .catch(() => {});
  }, []);

  const templatePresets = useMemo(() => getUniqueTemplatePresets(), []);

  function applyPreset(slug: string) {
    const preset = templatePresets.find((p) => p.slug === slug);
    if (!preset) return;
    const { experience: _e, ...configWithoutExperience } = preset.config;
    const merged = enrichDesignWithExperienceDNA({
      ...configWithoutExperience,
      media: design.media,
      studio: { ...DEFAULT_STUDIO_CONFIG, ...preset.config.studio, ...design.studio },
    });
    onChange(merged);
  }

  const previewDesign = useMemo(() => enrichDesignWithExperienceDNA(design), [design]);
  const dna = getTemplateExperienceDNA(design.layout);
  const collections = getExperienceCollectionsList();
  const HERO_LAYOUTS: HeroLayoutId[] = [
    "classic-centered", "vine-arch", "lace-frame", "hexagon-stack", "rings-spotlight", "media-canvas",
    "glass-frost", "garden-card", "royal-palace", "velvet-stage", "kente-weave", "garden-bloom",
    "boarding-pass", "crystal-prism", "islamic-arch", "memorial-candle", "neon-pulse", "corporate-grid",
    "editorial-split", "passport-stamp", "fullscreen-type", "magazine-stack",
  ];

  function applyTypographyPack(id: TypographyCategoryId) {
    const pack = getTypographyPack(id);
    if (!pack) return;
    onChange({
      ...design,
      fonts: { heading: pack.heading, script: pack.script, body: pack.body },
      experience: { ...experience, typographyPackId: pack.id, experienceCustomized: true },
    });
  }

  function applyBackgroundPack(id: BackgroundTypeId) {
    const pack = getBackgroundPack(id);
    if (!pack) return;
    onChange({
      ...design,
      colors: { ...design.colors, background: pack.preview },
      experience: { ...experience, backgroundPackId: pack.id, experienceCustomized: true },
    });
  }

  function applyExperienceDNAFromTemplate() {
    onChange(enrichDesignWithExperienceDNA({ ...design, experience: { ...experience, experienceCustomized: false } }));
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Layout className="h-4 w-4 text-[#0B8A83]" /> Template & reveal
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {templatePresets.map((p) => (
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

        <section className="rounded-2xl border bg-gradient-to-br from-[#0B8A83]/5 to-[#D4A63A]/5 p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Layers className="h-4 w-4 text-[#0B8A83]" /> Experience DNA V2
          </h3>
          <p className="text-xs text-slate-600">
            Each template ships with unique creative DNA — collection, hero layout, typography, atmosphere, and pacing.
            {dna ? (
              <span className="block mt-1 text-[#0B8A83] font-medium">
                Active: {collections.find((c) => c.id === dna.collectionId)?.label ?? dna.collectionId} · {formatHeroLayoutLabel(dna.heroLayout)}
              </span>
            ) : null}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Collection</Label>
              <Select
                value={experience.collectionId ?? dna.collectionId ?? ""}
                onValueChange={(v) => patchExperience({ collectionId: v as typeof experience.collectionId })}
              >
                <SelectTrigger><SelectValue placeholder="Collection" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Hero layout</Label>
              <Select
                value={experience.heroLayout ?? dna.heroLayout ?? "classic-centered"}
                onValueChange={(v) => patchExperience({ heroLayout: v as HeroLayoutId })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {HERO_LAYOUTS.map((id) => (
                    <SelectItem key={id} value={id}>{formatHeroLayoutLabel(id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Typography pack</Label>
              <Select
                value={(experience.typographyPackId as TypographyCategoryId) ?? dna.typographyPackId ?? "classic"}
                onValueChange={(v) => applyTypographyPack(v as TypographyCategoryId)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TYPOGRAPHY_PACKS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Background atmosphere</Label>
              <Select
                value={(experience.backgroundPackId as BackgroundTypeId) ?? dna.backgroundPackId ?? "static"}
                onValueChange={(v) => applyBackgroundPack(v as BackgroundTypeId)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {BACKGROUND_PACKS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Emotional pacing</Label>
              <Select
                value={experience.pacing ?? dna.pacing ?? "medium"}
                onValueChange={(v) => patchExperience({ pacing: v as ExperiencePacing })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACING_OPTIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applyExperienceDNAFromTemplate}>
            Reset to template DNA
          </Button>
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
                onChange(
                  enrichDesignWithExperienceDNA({
                    ...design,
                    colors: preset.colors,
                    experience: {
                      ...experience,
                      ...preset.experience,
                      themePresetId: preset.id,
                      openingExperience: preset.openingExperience,
                    },
                    studio: { ...studio, revealMode: mapOpeningToLegacyRevealMode(preset.openingExperience) },
                  })
                );
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
                  <SelectItem value="storybook">Celeventic storybook</SelectItem>
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
                  <SelectItem value="card-3d">3D cards</SelectItem>
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
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#0B8A83]" /> Frame & ornament</h3>
          <div className="space-y-1">
            <Label>Decorative frame</Label>
            <Select
              value={design.ornament ?? "none"}
              onValueChange={(v) =>
                onChange({
                  ...design,
                  ornament: v as InvitationDesignConfig["ornament"],
                  experience: { ...experience, experienceCustomized: true },
                })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORNAMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  {EXTENDED_BUTTON_STYLES.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
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
          <div className="space-y-1">
            <Label>Gallery slideshow style</Label>
            <Select
              value={(experience.slideshowStyle as SlideshowStyleId) ?? "fade-carousel"}
              onValueChange={(v) => patchExperience({ slideshowStyle: v as SlideshowStyleId })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLIDESHOW_STYLE_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={studio.fullScreen ?? true}
              onChange={(e) => patchStudio({ fullScreen: e.target.checked })}
              className="rounded border-slate-300"
            />
            Full-screen immersive (100dvh guest view)
          </label>
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Sparkles className="h-4 w-4 text-[#D4A63A]" /> Motion & outro
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Photo animation</Label>
              <Select
                value={design.animation ?? "fade"}
                onValueChange={(v) => patchDesign({ animation: v as typeof design.animation })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANIMATION_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Scene transitions</Label>
              <Select
                value={experience.sceneTransition ?? "fade"}
                onValueChange={(v) => patchExperience({ sceneTransition: v as SceneTransitionId })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENE_TRANSITIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Outro experience</Label>
            <Select
              value={experience.outroExperience ?? "thank-you-fade"}
              onValueChange={(v) => patchExperience({ outroExperience: v as OutroExperienceId })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTRO_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Thank you message</Label>
            <Input
              value={experience.thankYouMessage ?? ""}
              onChange={(e) => patchExperience({ thankYouMessage: e.target.value })}
              placeholder="Thank you for being part of our celebration…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={experience.enableRevealSounds ?? false}
              onChange={(e) => patchExperience({ enableRevealSounds: e.target.checked })}
              className="rounded border-slate-300"
            />
            Enable sound effects during reveal ceremony
          </label>
        </section>

        {(featureFlags.audioLibrary || featureFlags.audioUpload) && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Music className="h-4 w-4 text-[#0B8A83]" /> Background music
          </h3>
          <p className="text-xs text-slate-500">
            Pick a track from the library or upload your own. Guests hear this after opening the invite — tap the preview to test.
          </p>
          {onMusicChange && (
            <MusicPreferenceEditor
              value={musicSelection ?? null}
              onChange={onMusicChange}
              eventType={eventType}
            />
          )}
        </section>
        )}

        {onGalleryChange && (featureFlags.slideshow || featureFlags.videoUpload) && (
          <TemplateStudioMediaPanel
            design={design}
            galleryUrls={galleryUrls}
            onDesignChange={onChange}
            onGalleryChange={onGalleryChange}
            maxGalleryImages={mediaLimits.maxPhotos}
            allowVideoBackground={mediaLimits.allowVideoBackground}
          />
        )}

        <CanvaInspirationPanel />

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
          <InvitationStudioPreview
            design={previewDesign}
            event={event}
            message={message ?? ""}
            invitationName={event.title}
            musicSelection={musicSelection}
            galleryUrls={galleryUrls}
          />
        </div>
        <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
          <Music className="h-3 w-3" /> Tap &quot;Tap to Begin&quot; in the preview — music starts automatically. Use the music panel to swap tracks or upload your own.
        </p>
      </div>
    </div>
  );
}
