"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  Palette,
  Sparkles,
  Type,
  MousePointer,
  Layout,
  Music,
  Layers,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUniqueTemplatePresets } from "@/lib/invitation-templates";
import {
  getInvitationTheme,
  WEDDING_THEME_IDS,
  FUNERAL_THEME_IDS,
} from "@/lib/invitation-theme/theme-registry";
import { applyThemeToDesign } from "@/lib/invitation-theme/theme-compat";
import {
  FONT_STACKS,
  THANK_YOU_FONT_OPTIONS,
  resolveThankYouFontStack,
} from "@/lib/invitation-theme/fonts";
import {
  INVITATION_FONT_PRESETS,
  type InvitationFontPreset,
} from "@/lib/invitation-theme/font-presets";
import type { FontId } from "@/lib/invitation-theme/theme-types";
import { categoryForBlueprint } from "@/lib/invite-blueprints/blueprint-registry";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  BUTTON_POSITION_OPTIONS,
  DEFAULT_STUDIO_CONFIG,
} from "@/lib/invitation-studio/studio-types";
import type {
  EventExperienceConfig,
  OpeningExperienceId,
  OutroExperienceId,
  SceneTransitionId,
} from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import {
  filterOpeningsForEventType,
  isWeddingEventType,
  WEDDING_ALLOWED_OUTROS,
} from "@/lib/invitation/wedding-experience-filters";
import {
  OPENING_EXPERIENCES,
  mapLegacyRevealMode,
  mapOpeningToLegacyRevealMode,
} from "@/lib/experience/opening-experiences";
import { ENVIRONMENT_PRESETS } from "@/lib/experience/environment-presets";
import { INTRO_DURATION_OPTIONS } from "@/lib/experience/celeventic-palette";
import { INTRO_VARIANT_OPTIONS } from "@/lib/experience/intro-variants";
import { SLIDESHOW_STYLE_OPTIONS } from "@/lib/invitation/slideshow-styles";
import type { SlideshowStyleId } from "@/lib/invitation/slideshow-styles";
import { EXTENDED_BUTTON_STYLES } from "@/lib/invitation/invitation-button-styles";
import { EXPERIENCE_THEME_PRESETS } from "@/lib/experience/theme-presets";
import {
  enrichDesignWithExperienceDNA,
  getExperienceCollectionsList,
  getTemplateExperienceDNA,
} from "@/lib/experience/experience-engine-v2";
import { TemplateStudioMediaPanel } from "@/components/invitation-studio/template-studio-media-panel";
import { MusicPreferenceEditor } from "@/components/music/music-preference-editor";
import { VisionBoardStudioPanel } from "@/components/invitation-studio/vision-board-studio-panel";
import type { MusicSelection } from "@/lib/music/music-types";
import {
  TYPOGRAPHY_PACKS,
  getTypographyPack,
  type TypographyCategoryId,
} from "@/lib/experience/typography-engine";
import {
  BACKGROUND_PACKS,
  getBackgroundPack,
  type BackgroundTypeId,
} from "@/lib/experience/background-engine";
import type { HeroLayoutId, ExperiencePacing } from "@/lib/experience/experience-types";
import type { InvitationFeatureFlags } from "@/lib/invitation/admin-feature-flags";
import { DEFAULT_INVITATION_FEATURE_FLAGS } from "@/lib/invitation/admin-feature-flags";
import type { InvitationMediaLimits } from "@/lib/invitation/media-limits";
import { DEFAULT_INVITATION_MEDIA_LIMITS } from "@/lib/invitation/media-limits";
import {
  StudioToolbar,
  type StudioDevice,
} from "@/components/invitation-studio/studio-toolbar";
import { StudioScenesPanel } from "@/components/invitation-studio/studio-scenes-panel";
import { StudioCanvas, STUDIO_DEVICE_STORAGE_KEY } from "@/components/invitation-studio/studio-canvas";
import {
  StudioPropertiesPanel,
  PropSection,
  type StudioPropCategory,
} from "@/components/invitation-studio/studio-properties-panel";
import { StudioPublishChecklist } from "@/components/invitation-studio/studio-publish-checklist";
import { StudioLayersPanel } from "@/components/invitation-studio/studio-layers-panel";
import type { StudioSaveStatus } from "@/hooks/use-studio-autosave";
import type { StudioPublishContext } from "@/lib/invitation-studio/publish-validation";
import {
  mergeLayers,
  layersToOrderAndHidden,
  type StudioLayer,
  type StudioLayerId,
  type SnapGuideId,
} from "@/lib/invitation-studio/studio-layers";
import {
  mergeScenesWithTabs,
  enabledTabsFromScenes,
  toggleSceneVisibility,
} from "@/lib/invitation-studio/studio-scenes";
import type { StudioSceneConfig } from "@/lib/experience/experience-types";
import { STUDIO_BUTTON_ACTION_OPTIONS } from "@/lib/experience-engine/action-registry";
import type { StudioSnapshot } from "@/lib/invitation-studio/studio-history";

const ORNAMENT_OPTIONS = [
  { id: "gold-frame", label: "Gold frame" },
  { id: "vine", label: "Vine arch" },
  { id: "lace", label: "Lace overlay" },
  { id: "floral", label: "Floral border" },
  { id: "hexagon", label: "Hexagon frame" },
  { id: "none", label: "None" },
] as const;

/** Heading/body live-bind to `--font-display` / `--font-sans` (scoped to the invite viewport) —
 * registered FontIds only, so the studio pick always resolves to an already-loaded next/font.
 * Script currently only feeds designConfig (visual wiring is a template-by-template follow-up). */
const INVITE_FONT_OPTIONS = THANK_YOU_FONT_OPTIONS;
const OPENING_CATEGORIES = [
  "envelope",
  "curtain",
  "palace",
  "interactive",
  "instant",
] as const;

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
  { id: "seal-reform", label: "Seal reform" },
  { id: "credits-page", label: "Credits page" },
  { id: "candle-legacy", label: "Candle legacy" },
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

const ANIMATION_OPTIONS = [
  { id: "fade", label: "Gentle fade" },
  { id: "ken-burns", label: "Ken Burns zoom" },
  { id: "parallax", label: "Parallax drift" },
  { id: "none", label: "Static" },
] as const;

function formatHeroLayoutLabel(id: HeroLayoutId): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface InvitationStudioHubHandle {
  openPublishChecklist: () => void;
}

export interface InvitationStudioHubProps {
  design: InvitationDesignConfig;
  event: {
    title: string;
    hostName: string;
    description?: string | null;
    startDate: string;
    startDateRaw?: string;
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
  /** Order id — enables Sections editor deep-link */
  orderId?: string;
  catalogSlug?: string | null;
  /** History / autosave wiring from parent */
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  saveStatus?: StudioSaveStatus;
  lastSavedAt?: Date | null;
  onSaveNow?: () => void;
  onRequestPreview?: () => void;
  publishContext?: StudioPublishContext;
  versions?: StudioSnapshot[];
  onSaveVersion?: (label: string) => void;
  onRestoreVersion?: (id: string) => void;
}

export const InvitationStudioHub = forwardRef<
  InvitationStudioHubHandle,
  InvitationStudioHubProps
>(function InvitationStudioHub(
  {
    design,
    event,
    message,
    eventType,
    musicSelection,
    onMusicChange,
    galleryUrls = [],
    onGalleryChange,
    onChange,
    onSave,
    saving,
    orderId,
    catalogSlug,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    saveStatus = "idle",
    lastSavedAt,
    onSaveNow,
    onRequestPreview,
    publishContext,
    versions = [],
    onSaveVersion,
    onRestoreVersion,
  },
  ref
) {
  const [device, setDeviceState] = useState<StudioDevice>(() => {
    if (typeof window === "undefined") return "mobile";
    const stored = window.sessionStorage.getItem(STUDIO_DEVICE_STORAGE_KEY);
    return stored === "mobile" || stored === "tablet" || stored === "desktop" ? stored : "mobile";
  });
  const setDevice = useCallback((next: StudioDevice) => {
    setDeviceState(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STUDIO_DEVICE_STORAGE_KEY, next);
    }
  }, []);
  const [leftTab, setLeftTab] = useState<"scenes" | "assets">("scenes");
  const [propCategory, setPropCategory] = useState<StudioPropCategory>("experience");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"scenes" | "assets" | "props" | null>(null);
  const [featureFlags, setFeatureFlags] = useState<InvitationFeatureFlags>(
    DEFAULT_INVITATION_FEATURE_FLAGS
  );
  const [mediaLimits, setMediaLimits] = useState<InvitationMediaLimits>(
    DEFAULT_INVITATION_MEDIA_LIMITS
  );

  useImperativeHandle(ref, () => ({
    openPublishChecklist: () => setChecklistOpen(true),
  }));

  const studio = design.studio ?? DEFAULT_STUDIO_CONFIG;
  const experience = design.experience ?? {};
  const scenes = useMemo(
    () => mergeScenesWithTabs(experience.scenes, experience.enabledTabs ?? DEFAULT_HUB_TABS),
    [experience.scenes, experience.enabledTabs]
  );
  const activeScene =
    scenes.find((s) => s.id === selectedSceneId) ?? scenes[0] ?? null;

  function patchDesign(patch: Partial<InvitationDesignConfig>) {
    onChange({ ...design, ...patch });
  }

  function patchStudio(patch: Partial<typeof studio>) {
    onChange({ ...design, studio: { ...studio, ...patch } });
  }

  function patchExperience(patch: Partial<EventExperienceConfig>) {
    onChange({ ...design, experience: { ...experience, ...patch } });
  }

  /** Applies a curated font-pairing preset across role-based fonts + the thank-you section. */
  function applyFontPreset(preset: InvitationFontPreset) {
    onChange({
      ...design,
      fonts: {
        heading: preset.headingFont,
        script: preset.scriptFont,
        body: preset.bodyFont,
        eyebrow: preset.eyebrowFont,
        presetId: preset.id,
      },
      experience: {
        ...experience,
        thankYouFontFamily: preset.bodyFont,
        thankYouEyebrowFontFamily: preset.eyebrowFont,
        thankYouScriptFontFamily: preset.scriptFont,
        experienceCustomized: true,
      },
    });
  }

  function setOpeningExperience(id: OpeningExperienceId) {
    onChange({
      ...design,
      experience: { ...experience, openingExperience: id },
      studio: { ...studio, revealMode: mapOpeningToLegacyRevealMode(id) },
    });
  }

  function handleScenesChange(next: StudioSceneConfig[]) {
    const tabs = enabledTabsFromScenes(next);
    patchExperience({
      scenes: next,
      enabledTabs: tabs,
      experienceCustomized: true,
    });
    if (selectedSceneId && !next.some((s) => s.id === selectedSceneId)) {
      setSelectedSceneId(next[0]?.id ?? null);
    }
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        onRedo?.();
      } else if (e.key === "s") {
        e.preventDefault();
        onSaveNow?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUndo, onRedo, onSaveNow]);

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
    "classic-centered",
    "vine-arch",
    "lace-frame",
    "hexagon-stack",
    "rings-spotlight",
    "media-canvas",
    "glass-frost",
    "garden-card",
    "royal-palace",
    "velvet-stage",
    "kente-weave",
    "garden-bloom",
    "boarding-pass",
    "crystal-prism",
    "islamic-arch",
    "memorial-candle",
    "neon-pulse",
    "corporate-grid",
    "editorial-split",
    "passport-stamp",
    "fullscreen-type",
    "magazine-stack",
  ];

  function applyTypographyPack(id: TypographyCategoryId) {
    const pack = getTypographyPack(id);
    if (!pack) return;
    onChange({
      ...design,
      fonts: { heading: pack.heading, script: pack.script, body: pack.body },
      experience: {
        ...experience,
        typographyPackId: pack.id,
        experienceCustomized: true,
      },
    });
  }

  function applyBackgroundPack(id: BackgroundTypeId) {
    const pack = getBackgroundPack(id);
    if (!pack) return;
    onChange({
      ...design,
      colors: { ...design.colors, background: pack.preview },
      experience: {
        ...experience,
        backgroundPackId: pack.id,
        experienceCustomized: true,
      },
    });
  }

  function applyExperienceDNAFromTemplate() {
    onChange(
      enrichDesignWithExperienceDNA({
        ...design,
        experience: { ...experience, experienceCustomized: false },
      })
    );
  }

  const pagedThemeIds = design.blueprintId
    ? categoryForBlueprint(design.blueprintId) === "funeral"
      ? FUNERAL_THEME_IDS
      : WEDDING_THEME_IDS
    : [];

  const checklistCtx: StudioPublishContext = publishContext ?? {
    design,
    eventTitle: event.title,
    eventDate: event.startDateRaw ?? event.startDate,
    hostName: event.hostName,
    galleryUrls,
    musicSelection,
    mapsLink: event.mapsLink,
    venueName: event.venueName,
  };

  function selectScene(id: string) {
    setSelectedSceneId(id);
    setPropCategory("experience");
  }

  function patchActiveScene(patch: Partial<StudioSceneConfig>) {
    if (!activeScene) return;
    handleScenesChange(
      scenes.map((s) => (s.id === activeScene.id ? { ...s, ...patch } : s))
    );
  }

  async function handlePublishContinue() {
    setChecklistOpen(false);
    if (onRequestPreview) {
      onRequestPreview();
    } else if (onSave) {
      await onSave();
    }
  }

  const assetsSlot =
    onGalleryChange && (featureFlags.slideshow || featureFlags.videoUpload) ? (
      <TemplateStudioMediaPanel
        design={design}
        galleryUrls={galleryUrls}
        onDesignChange={onChange}
        onGalleryChange={onGalleryChange}
        maxGalleryImages={mediaLimits.maxPhotos}
        allowVideoBackground={mediaLimits.allowVideoBackground}
      />
    ) : (
      <p className="text-xs text-slate-500">Media uploads are unavailable for this package.</p>
    );

  return (
    <div className="-mx-4 flex h-[calc(100dvh-8.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:-mx-0">
      <StudioToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => onUndo?.()}
        onRedo={() => onRedo?.()}
        device={device}
        onDeviceChange={setDevice}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSaveNow={() => onSaveNow?.() ?? void onSave?.()}
        onPreview={() => setChecklistOpen(true)}
        onPublishCheck={() => setChecklistOpen(true)}
        saving={saving}
        versions={versions}
        onSaveVersion={onSaveVersion}
        onRestoreVersion={onRestoreVersion}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* Left — Scenes / Assets */}
        <div className="hidden min-h-0 lg:block">
          <StudioScenesPanel
            scenes={scenes}
            selectedSceneId={activeScene?.id ?? null}
            onSelectScene={selectScene}
            onScenesChange={handleScenesChange}
            leftTab={leftTab}
            onLeftTabChange={setLeftTab}
            assetsSlot={assetsSlot}
            blocksHref={orderId ? `/invitations/create/${orderId}/blocks` : null}
            eventType={eventType}
          />
        </div>

        {/* Center — Live canvas */}
        <StudioCanvas
          device={device}
          design={previewDesign}
          event={event}
          message={message}
          musicSelection={musicSelection}
          galleryUrls={galleryUrls}
          catalogSlug={catalogSlug}
        />

        {/* Right — Properties (desktop sidebar + mobile sheet) */}
        <div
          className={
            mobileSheet === "props"
              ? "fixed inset-x-0 bottom-0 z-[71] flex h-[78dvh] flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl lg:static lg:z-auto lg:h-auto lg:rounded-none lg:border-0 lg:shadow-none"
              : "hidden min-h-0 lg:block"
          }
        >
          {mobileSheet === "props" && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 lg:hidden">
              <p className="text-sm font-semibold">Properties</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setMobileSheet(null)}>
                Done
              </Button>
            </div>
          )}
          <StudioPropertiesPanel
            category={propCategory}
            onCategoryChange={setPropCategory}
            selectedSceneLabel={activeScene?.title ?? null}
          >
            {propCategory === "template" && (
              <>
                {pagedThemeIds.length > 0 && (
                  <PropSection
                    title="Theme (Studio 2.0)"
                    icon={<Palette className="h-4 w-4 text-[#D4A63A]" />}
                    accent
                  >
                    <p className="text-xs text-slate-500">
                      Instant re-skin — colors, fonts, motifs, and motion swap together.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pagedThemeIds.map((id) => {
                        const theme = getInvitationTheme(id);
                        if (!theme) return null;
                        const active = design.themeId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onChange(applyThemeToDesign(design, theme))}
                            aria-pressed={active}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              active
                                ? "border-[#D4A63A] ring-1 ring-[#D4A63A] bg-[#D4A63A]/10 text-[#0F172A]"
                                : "border-slate-200 text-slate-600 hover:border-[#D4A63A]/60"
                            }`}
                          >
                            <span
                              aria-hidden
                              className="inline-block h-4 w-4 rounded-full border border-slate-300"
                              style={{
                                background: `linear-gradient(135deg, ${theme.color.surface} 50%, ${theme.color.accent} 50%)`,
                              }}
                            />
                            {theme.name}
                          </button>
                        );
                      })}
                    </div>
                  </PropSection>
                )}

                <PropSection
                  title="Template & reveal"
                  icon={<Layout className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <div className="grid gap-2">
                    {templatePresets.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => applyPreset(p.slug)}
                        className={`rounded-xl border p-2.5 text-left transition-all hover:border-[#0B8A83] ${
                          design.layout === p.slug
                            ? "border-[#0B8A83] bg-[#0B8A83]/5 ring-1 ring-[#0B8A83]"
                            : "border-slate-200"
                        }`}
                      >
                        <div
                          className={`mb-1.5 h-8 rounded-lg bg-gradient-to-br ${p.preview.gradient}`}
                        />
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label>Opening experience</Label>
                    <Select
                      value={activeOpening}
                      onValueChange={(v) => setOpeningExperience(v as OpeningExperienceId)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {OPENING_CATEGORIES.map((cat) => {
                          const items = filterOpeningsForEventType(
                            OPENING_EXPERIENCES.filter((e) => e.category === cat),
                            eventType
                          );
                          if (items.length === 0) return null;
                          return (
                            <div key={cat}>
                              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {cat}
                              </p>
                              {items.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.label}
                                </SelectItem>
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
                </PropSection>
              </>
            )}

            {propCategory === "experience" && (
              <>
                {activeScene && (
                  <PropSection
                    title={`Scene · ${activeScene.title}`}
                    icon={<Layers className="h-4 w-4 text-[#0B8A83]" />}
                    accent
                  >
                    <div className="space-y-1">
                      <Label>Section title</Label>
                      <Input
                        value={activeScene.title}
                        onChange={(e) => patchActiveScene({ title: e.target.value })}
                      />
                    </div>
                    {activeScene.tabId === "custom" ? (
                      <div className="space-y-1">
                        <Label>Section body</Label>
                        <Textarea
                          value={activeScene.body ?? ""}
                          onChange={(e) => patchActiveScene({ body: e.target.value })}
                          rows={4}
                          placeholder="Write the guest-facing content for this custom section…"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Hub section content comes from Details / Sections editor. Hide or reorder
                        this scene from the left panel — preview updates live.
                      </p>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={activeScene.visible !== false}
                        disabled={activeScene.tabId === "invitation"}
                        onChange={() =>
                          handleScenesChange(toggleSceneVisibility(scenes, activeScene.id))
                        }
                        className="rounded border-slate-300"
                      />
                      Visible to guests
                    </label>
                  </PropSection>
                )}
                <PropSection
                  title="Experience DNA V2"
                  icon={<Layers className="h-4 w-4 text-[#0B8A83]" />}
                  accent
                >
                  <p className="text-xs text-slate-600">
                    Each template ships with unique creative DNA.
                    {dna ? (
                      <span className="mt-1 block font-medium text-[#0B8A83]">
                        Active:{" "}
                        {collections.find((c) => c.id === dna.collectionId)?.label ??
                          dna.collectionId}{" "}
                        · {formatHeroLayoutLabel(dna.heroLayout)}
                      </span>
                    ) : null}
                  </p>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label>Collection</Label>
                      <Select
                        value={experience.collectionId ?? dna.collectionId ?? ""}
                        onValueChange={(v) =>
                          patchExperience({
                            collectionId: v as typeof experience.collectionId,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Collection" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Hero layout</Label>
                      <Select
                        value={experience.heroLayout ?? dna.heroLayout ?? "classic-centered"}
                        onValueChange={(v) =>
                          patchExperience({ heroLayout: v as HeroLayoutId })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {HERO_LAYOUTS.map((id) => (
                            <SelectItem key={id} value={id}>
                              {formatHeroLayoutLabel(id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Typography pack</Label>
                      <Select
                        value={
                          (experience.typographyPackId as TypographyCategoryId) ??
                          dna.typographyPackId ??
                          "classic"
                        }
                        onValueChange={(v) => applyTypographyPack(v as TypographyCategoryId)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {TYPOGRAPHY_PACKS.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Background atmosphere</Label>
                      <Select
                        value={
                          (experience.backgroundPackId as BackgroundTypeId) ??
                          dna.backgroundPackId ??
                          "static"
                        }
                        onValueChange={(v) => applyBackgroundPack(v as BackgroundTypeId)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {BACKGROUND_PACKS.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Emotional pacing</Label>
                      <Select
                        value={experience.pacing ?? dna.pacing ?? "medium"}
                        onValueChange={(v) =>
                          patchExperience({ pacing: v as ExperiencePacing })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PACING_OPTIONS.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyExperienceDNAFromTemplate}
                  >
                    Reset to template DNA
                  </Button>
                </PropSection>

                <PropSection
                  title="Experience theme"
                  icon={<Sparkles className="h-4 w-4 text-[#D4A63A]" />}
                >
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
                            studio: {
                              ...studio,
                              revealMode: mapOpeningToLegacyRevealMode(
                                preset.openingExperience
                              ),
                            },
                          })
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a theme…" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_THEME_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PropSection>

                <PropSection
                  title="Cinematic intro"
                  icon={<Sparkles className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={experience.introEnabled ?? true}
                      onChange={(e) =>
                        patchExperience({ introEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300"
                    />
                    Show Celeventic logo intro
                  </label>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label>Intro duration</Label>
                      <Select
                        value={String(experience.introDurationSec ?? 3)}
                        onValueChange={(v) =>
                          patchExperience({
                            introDurationSec: parseFloat(
                              v
                            ) as EventExperienceConfig["introDurationSec"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTRO_DURATION_OPTIONS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} seconds
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Intro style</Label>
                      <Select
                        value={experience.introVariant ?? "auto"}
                        onValueChange={(v) =>
                          patchExperience({
                            introVariant:
                              v === "auto"
                                ? undefined
                                : (v as EventExperienceConfig["introVariant"]),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (match template)</SelectItem>
                          {INTRO_VARIANT_OPTIONS.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PropSection>

                <PropSection
                  title="Living environment"
                  icon={<Wind className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <div className="space-y-1">
                    <Label>Particle environment</Label>
                    <Select
                      value={experience.environment ?? "none"}
                      onValueChange={(v) =>
                        patchExperience({
                          environment: v as EventExperienceConfig["environment"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENVIRONMENT_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Particle density</Label>
                    <Select
                      value={experience.environmentIntensity ?? "medium"}
                      onValueChange={(v) =>
                        patchExperience({
                          environmentIntensity:
                            v as EventExperienceConfig["environmentIntensity"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Hub navigation</Label>
                    <Select
                      value={experience.hubMode ?? "scroll"}
                      onValueChange={(v) =>
                        patchExperience({ hubMode: v as EventExperienceConfig["hubMode"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scroll">Scroll with tabs</SelectItem>
                        <SelectItem value="tabs">Tab sections</SelectItem>
                        <SelectItem value="journey">Chapter journey</SelectItem>
                        <SelectItem value="storybook">Celeventic storybook</SelectItem>
                        {(design.theme || design.blueprintId) && (
                          <SelectItem value="paged">Paged pages (new)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Countdown style</Label>
                    <Select
                      value={experience.countdownStyle ?? "classic"}
                      onValueChange={(v) =>
                        patchExperience({
                          countdownStyle: v as EventExperienceConfig["countdownStyle"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                        <SelectItem value="linen">Linen editorial (TM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PropSection>
              </>
            )}

            {propCategory === "look" && (
              <>
                <StudioLayersPanel
                  layers={mergeLayers(
                    experience.layerOrder as StudioLayerId[] | undefined,
                    experience.hiddenLayers as StudioLayerId[] | undefined
                  )}
                  snapGuideId={experience.snapGuideId}
                  onLayersChange={(layers: StudioLayer[]) => {
                    const { layerOrder, hiddenLayers } = layersToOrderAndHidden(layers);
                    patchExperience({
                      layerOrder,
                      hiddenLayers,
                      experienceCustomized: true,
                    });
                  }}
                  onSnapGuideChange={(id) =>
                    patchExperience({
                      snapGuideId: id === "none" ? undefined : (id as SnapGuideId),
                      experienceCustomized: true,
                    })
                  }
                />

                <PropSection
                  title="Colors"
                  icon={<Palette className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      ["primary", "secondary", "accent", "background", "text"] as const
                    ).map((key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs capitalize">{key}</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={design.colors[key]}
                            onChange={(e) => patchColors(key, e.target.value)}
                            className="h-9 w-10 cursor-pointer rounded"
                          />
                          <Input
                            value={design.colors[key]}
                            onChange={(e) => patchColors(key, e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </PropSection>

                <PropSection
                  title="Frame & ornament"
                  icon={<Sparkles className="h-4 w-4 text-[#0B8A83]" />}
                >
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORNAMENT_OPTIONS.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PropSection>

                <PropSection
                  title="Font pairing"
                  icon={<Type className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <p className="text-[11px] text-slate-500">
                    One-click font presets — inspired by the Traditional Marriage thank-you card
                    (tracked serif eyebrow, sweeping script, readable serif body). Applies to
                    headings, script, body, and the thank-you section together.
                  </p>
                  <div className="grid gap-2.5">
                    {INVITATION_FONT_PRESETS.map((preset) => {
                      const isActive = (design.fonts?.presetId ?? "with-gratitude") === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyFontPreset(preset)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left transition-colors",
                            isActive
                              ? "border-[#0B8A83] bg-[#0B8A83]/5 ring-1 ring-[#0B8A83]/40"
                              : "border-slate-200 bg-white hover:border-[#0B8A83]/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[10px] uppercase tracking-[0.28em] text-slate-500"
                              style={{ fontFamily: FONT_STACKS[preset.eyebrowFont] }}
                            >
                              {preset.label}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-medium text-[#0B8A83]">
                                Applied
                              </span>
                            )}
                          </div>
                          <p
                            className="mt-0.5 text-xl leading-none text-[#1f2937]"
                            style={{ fontFamily: FONT_STACKS[preset.scriptFont] }}
                          >
                            Thank you
                          </p>
                          <p
                            className="mt-1 text-xs leading-snug text-slate-600"
                            style={{ fontFamily: FONT_STACKS[preset.bodyFont] }}
                          >
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </PropSection>

                <PropSection
                  title="Typography"
                  icon={<Type className="h-4 w-4 text-[#0B8A83]" />}
                >
                  <p className="text-[11px] text-slate-500">
                    Fine-tune individual roles. Heading &amp; body apply live across the invite;
                    script drives the Traditional Marriage thank-you title and lands on other
                    templates progressively.
                  </p>
                  <div className="grid gap-3">
                    {(["heading", "script", "body"] as const).map((role) => (
                      <div key={role} className="space-y-1">
                        <Label className="text-xs capitalize">{role}</Label>
                        <Select
                          value={design.fonts?.[role] ?? "cormorant"}
                          onValueChange={(v) =>
                            onChange({
                              ...design,
                              fonts: { ...design.fonts, [role]: v, presetId: undefined },
                              experience: { ...experience, experienceCustomized: true },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITE_FONT_OPTIONS.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                <span style={{ fontFamily: FONT_STACKS[f.id as FontId] }}>{f.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Heading</Label>
                      <Input
                        type="number"
                        value={studio.headingSize ?? 28}
                        onChange={(e) =>
                          patchStudio({ headingSize: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Script</Label>
                      <Input
                        type="number"
                        value={studio.scriptSize ?? 22}
                        onChange={(e) =>
                          patchStudio({ scriptSize: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Input
                        type="number"
                        value={studio.bodySize ?? 14}
                        onChange={(e) =>
                          patchStudio({ bodySize: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </PropSection>
              </>
            )}

            {propCategory === "motion" && (
              <PropSection
                title="Motion & outro"
                icon={<Sparkles className="h-4 w-4 text-[#D4A63A]" />}
              >
                <div className="space-y-1">
                  <Label>Photo animation</Label>
                  <Select
                    value={design.animation ?? "fade"}
                    onValueChange={(v) =>
                      patchDesign({ animation: v as typeof design.animation })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_OPTIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Parallax intensity</Label>
                  <Select
                    value={experience.parallaxIntensity ?? (design.animation === "parallax" ? "moderate" : "none")}
                    onValueChange={(v) => {
                      const intensity = v as import("@/lib/experience/experience-types").StudioParallaxIntensity;
                      onChange({
                        ...design,
                        animation:
                          intensity === "none"
                            ? design.animation === "parallax"
                              ? "fade"
                              : design.animation
                            : "parallax",
                        experience: {
                          ...experience,
                          parallaxIntensity: intensity,
                          experienceCustomized: true,
                        },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="interactive">Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scene transitions</Label>
                  <Select
                    value={experience.sceneTransition ?? "fade"}
                    onValueChange={(v) =>
                      patchExperience({ sceneTransition: v as SceneTransitionId })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCENE_TRANSITIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Outro experience</Label>
                  <Select
                    value={experience.outroExperience ?? "thank-you-fade"}
                    onValueChange={(v) =>
                      patchExperience({ outroExperience: v as OutroExperienceId })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTRO_OPTIONS.filter((o) =>
                        !isWeddingEventType(eventType) || WEDDING_ALLOWED_OUTROS.has(o.id)
                      ).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Thank you message</Label>
                  <Textarea
                    rows={4}
                    value={experience.thankYouMessage ?? ""}
                    onChange={(e) =>
                      patchExperience({
                        thankYouMessage: e.target.value,
                        experienceCustomized: true,
                      })
                    }
                    placeholder="Your presence is a blessing. We are deeply honoured to share this sacred day with you."
                  />
                  <p className="text-[11px] text-slate-500">
                    Shown in the invitation Thank You section (WITH GRATITUDE). Guests see this read-only.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Eyebrow font (“WITH GRATITUDE”)</Label>
                    <Select
                      value={experience.thankYouEyebrowFontFamily ?? "cormorant"}
                      onValueChange={(v) =>
                        patchExperience({
                          thankYouEyebrowFontFamily: v,
                          experienceCustomized: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THANK_YOU_FONT_OPTIONS.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            <span style={{ fontFamily: FONT_STACKS[o.id] }}>{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Script font (“Thank you”)</Label>
                    <Select
                      value={experience.thankYouScriptFontFamily ?? "great-vibes"}
                      onValueChange={(v) =>
                        patchExperience({
                          thankYouScriptFontFamily: v,
                          experienceCustomized: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THANK_YOU_FONT_OPTIONS.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            <span style={{ fontFamily: FONT_STACKS[o.id] }}>{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body font (message)</Label>
                    <Select
                      value={experience.thankYouFontFamily ?? "cormorant"}
                      onValueChange={(v) =>
                        patchExperience({
                          thankYouFontFamily: v,
                          experienceCustomized: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THANK_YOU_FONT_OPTIONS.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            <span style={{ fontFamily: FONT_STACKS[o.id] }}>{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <p
                    className="text-[10px] uppercase tracking-[0.32em] text-slate-500"
                    style={{
                      fontFamily: resolveThankYouFontStack(
                        experience.thankYouEyebrowFontFamily ?? "cormorant"
                      ),
                    }}
                  >
                    With gratitude
                  </p>
                  <p
                    className="text-2xl leading-none text-[#5C3D2E]"
                    style={{
                      fontFamily: resolveThankYouFontStack(
                        experience.thankYouScriptFontFamily ?? "great-vibes"
                      ),
                    }}
                  >
                    Thank you
                  </p>
                  {experience.thankYouMessage?.trim() ? (
                    <p
                      className="mt-2 rounded-lg border border-slate-200 bg-[#FAF8F4] px-3 py-2.5 text-sm leading-relaxed text-[#5C3D2E] whitespace-pre-line"
                      style={{
                        fontFamily: resolveThankYouFontStack(
                          experience.thankYouFontFamily
                        ),
                      }}
                    >
                      {experience.thankYouMessage}
                    </p>
                  ) : null}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={experience.enableRevealSounds ?? false}
                    onChange={(e) =>
                      patchExperience({ enableRevealSounds: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  Sound effects during reveal
                </label>
              </PropSection>
            )}

            {propCategory === "buttons" && (
              <PropSection
                title="Buttons & RSVP"
                icon={<MousePointer className="h-4 w-4 text-[#0B8A83]" />}
              >
                <div className="space-y-1">
                  <Label>Button style</Label>
                  <Select
                    value={studio.buttonStyle ?? "gold"}
                    onValueChange={(v) =>
                      patchStudio({ buttonStyle: v as typeof studio.buttonStyle })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTENDED_BUTTON_STYLES.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Button position</Label>
                  <Select
                    value={studio.buttonPosition ?? "center"}
                    onValueChange={(v) =>
                      patchStudio({
                        buttonPosition: v as typeof studio.buttonPosition,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_POSITION_OPTIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>RSVP button label</Label>
                  <Input
                    value={studio.rsvpLabel ?? "RSVP Now"}
                    onChange={(e) => patchStudio({ rsvpLabel: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <p className="text-[11px] text-slate-500">
                    Actions map through the Action Registry — preview suppresses real RSVP & payments.
                  </p>
                  {(
                    [
                      ["primary", "Primary action"],
                      ["secondary", "Secondary action"],
                      ["tertiary", "Tertiary action"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Select
                        value={experience.buttonActions?.[key] ?? (key === "primary" ? "rsvp" : key === "secondary" ? "calendar" : "share")}
                        onValueChange={(v) =>
                          patchExperience({
                            buttonActions: {
                              ...experience.buttonActions,
                              [key]: v as import("@/lib/experience/experience-types").StudioButtonActionId,
                            },
                            experienceCustomized: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STUDIO_BUTTON_ACTION_OPTIONS.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                              {o.registryKey ? ` · ${o.registryKey}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label>Secondary button label</Label>
                  <Input
                    value={studio.secondaryLabel ?? ""}
                    onChange={(e) => patchStudio({ secondaryLabel: e.target.value })}
                    placeholder="Add to calendar"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Intro line</Label>
                  <Input
                    value={design.introText ?? ""}
                    onChange={(e) => patchDesign({ introText: e.target.value })}
                    placeholder="Together with their families"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Gallery slideshow style</Label>
                  <Select
                    value={(experience.slideshowStyle as SlideshowStyleId) ?? "fade-carousel"}
                    onValueChange={(v) =>
                      patchExperience({ slideshowStyle: v as SlideshowStyleId })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLIDESHOW_STYLE_OPTIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={studio.fullScreen ?? true}
                    onChange={(e) => patchStudio({ fullScreen: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Full-screen immersive guest view
                </label>
                {design.layout === "traditional-marriage-ceremony" && (
                  <VisionBoardStudioPanel
                    value={studio.visionBoard}
                    onChange={(visionBoard) => patchStudio({ visionBoard })}
                  />
                )}
              </PropSection>
            )}

            {propCategory === "music" && (
              <PropSection
                title="Background music"
                icon={<Music className="h-4 w-4 text-[#0B8A83]" />}
              >
                {(featureFlags.audioLibrary || featureFlags.audioUpload) && onMusicChange ? (
                  <>
                    <p className="text-xs text-slate-500">
                      Library or upload only — trim the clip guests hear. Tap the live preview
                      to test.
                    </p>
                    <MusicPreferenceEditor
                      value={musicSelection ?? null}
                      onChange={onMusicChange}
                      eventType={eventType}
                    />
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    Music editing is not enabled for this package.
                  </p>
                )}
              </PropSection>
            )}
          </StudioPropertiesPanel>
        </div>
      </div>

      {/* Mobile: open sheets for scenes / assets / properties */}
      <div className="flex gap-2 border-t border-slate-200 bg-white p-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setLeftTab("scenes");
            setMobileSheet("scenes");
          }}
        >
          Scenes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setLeftTab("assets");
            setMobileSheet("assets");
          }}
        >
          Assets
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => setMobileSheet("props")}
        >
          Edit
        </Button>
      </div>

      {(mobileSheet === "scenes" || mobileSheet === "assets") && (
        <div
          className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="flex-1"
            aria-label="Close panel"
            onClick={() => setMobileSheet(null)}
          />
          <div className="max-h-[78dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-[#0F172A]">
                {mobileSheet === "assets" ? "Assets" : "Scenes"}
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setMobileSheet(null)}>
                Done
              </Button>
            </div>
            <div className="max-h-[calc(78dvh-3.25rem)] overflow-y-auto">
              <div className="h-[min(70dvh,520px)]">
                <StudioScenesPanel
                  scenes={scenes}
                  selectedSceneId={activeScene?.id ?? null}
                  onSelectScene={(id) => {
                    selectScene(id);
                    setMobileSheet(null);
                  }}
                  onScenesChange={handleScenesChange}
                  leftTab={mobileSheet === "assets" ? "assets" : "scenes"}
                  onLeftTabChange={(t) => {
                    setLeftTab(t);
                    setMobileSheet(t);
                  }}
                  assetsSlot={assetsSlot}
                  blocksHref={orderId ? `/invitations/create/${orderId}/blocks` : null}
                  eventType={eventType}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileSheet === "props" && (
        <button
          type="button"
          className="fixed inset-0 z-[70] bg-black/40 lg:hidden"
          aria-label="Close properties"
          onClick={() => setMobileSheet(null)}
        />
      )}

      <StudioPublishChecklist
        open={checklistOpen}
        context={checklistCtx}
        onClose={() => setChecklistOpen(false)}
        onContinue={() => void handlePublishContinue()}
        continuing={saving}
      />
    </div>
  );
});
