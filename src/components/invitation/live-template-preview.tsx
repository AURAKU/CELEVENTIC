"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { pauseAllInvitationAudio } from "@/lib/music/invitation-audio-manager";
import { pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import { TemplatePreviewGlimpse } from "@/components/invitation/template-preview-glimpse";
import { InvitationStaticPreviewProvider } from "@/components/invitation/invitation-static-preview";
import { PreviewTapAffordance } from "@/components/invitation/preview-tap-affordance";
import {
  previewAutoOpensReveal,
  previewTapLabelForOpening,
} from "@/lib/experience/opening-experiences";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { Play, Smartphone, Monitor, Music2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LivePreviewVariant = "picker" | "card" | "hero" | "detail";
export type PreviewDevice = "mobile" | "desktop";

const MOBILE_FRAME_WIDTH = 390;
const DESKTOP_FRAME_WIDTH = 720;

const VARIANT_CONFIG: Record<
  LivePreviewVariant,
  {
    height: number;
    thumbScale: number;
    interactive: boolean;
  }
> = {
  picker: { height: 132, thumbScale: 0.32, interactive: false },
  card: { height: 248, thumbScale: 0.36, interactive: false },
  hero: { height: 580, thumbScale: 1, interactive: true },
  detail: { height: 700, thumbScale: 1, interactive: true },
};

interface LiveTemplatePreviewProps {
  layoutSlug: string;
  /** Catalog SKU — required for unique DNA when multiple SKUs share a layout */
  catalogSlug?: string;
  category?: string;
  features?: string[];
  musicEnabled?: boolean;
  variant?: LivePreviewVariant;
  className?: string;
  showBadge?: boolean;
  showDeviceToggle?: boolean;
  /** When true (default), live invite only mounts after explicit user tap */
  tapToOpen?: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  memoryUploadQrImageUrl?: string | null;
  memoryEventId?: string | null;
  memoryAlbumTitle?: string | null;
}

function PreviewDeviceChrome({
  device,
  children,
}: {
  device: PreviewDevice;
  children: React.ReactNode;
}) {
  if (device === "mobile") {
    return (
      <div
        className="mx-auto shrink-0 rounded-[2rem] border-[5px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden"
        style={{ width: MOBILE_FRAME_WIDTH }}
      >
        <div className="flex h-5 items-end justify-center bg-slate-900 pb-0.5">
          <div className="h-1 w-14 rounded-full bg-slate-600" />
        </div>
        <div className="relative bg-[#FAF8F4] overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto shrink-0 w-full max-w-[720px] rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden"
      style={{ width: DESKTOP_FRAME_WIDTH, maxWidth: "100%" }}
    >
      <div className="flex h-9 items-center gap-1.5 border-b bg-slate-100 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-400">
          celeventic.com/invite/preview
        </span>
      </div>
      <div className="relative bg-[#FAF8F4] overflow-hidden">{children}</div>
    </div>
  );
}

function LivePreviewExperience({
  preview,
  device,
  fullScreen,
  compactFrame,
  skipReveal,
  musicEnabled,
  musicAutoplay,
  memoryUploadUrl,
  memoryAlbumUrl,
  memoryUploadQrImageUrl,
  memoryEventId,
  memoryAlbumTitle,
  skipIntro = true,
  skipTapGate = true,
  autoOpenReveal = false,
}: {
  preview: ReturnType<typeof buildLivePreviewProps>;
  device: PreviewDevice;
  fullScreen: boolean;
  compactFrame: boolean;
  skipReveal: boolean;
  musicEnabled: boolean;
  musicAutoplay: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  memoryUploadQrImageUrl?: string | null;
  memoryEventId?: string | null;
  memoryAlbumTitle?: string | null;
  /** Compact thumbs skip; interactive detail/hero can run soft-intro → tap gate */
  skipIntro?: boolean;
  skipTapGate?: boolean;
  /**
   * Catalogue tap already unlocked audio — start envelope/curtain open immediately
   * (same one-shot path guests get after their open gesture).
   */
  autoOpenReveal?: boolean;
}) {
  const bg = pageBackgroundFromDesign(preview.design);
  const experience = (
    <PreviewDeviceChrome device={device}>
      <div
        className="relative w-full"
        style={{
          pointerEvents: "auto",
          /* Give absolute/fixed reveal shells a real box inside scaled frames. */
          minHeight: fullScreen ? (device === "desktop" ? 560 : 640) : 520,
          height: fullScreen ? (device === "desktop" ? 560 : 640) : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PremiumInviteWrapper
          skipReveal={skipReveal}
          skipIntro={skipIntro}
          skipTapGate={skipTapGate}
          skipAnalytics
          autoOpenReveal={autoOpenReveal}
          musicEnabled={musicEnabled}
          musicAutoplay={musicAutoplay}
          musicSelection={preview.musicSelection}
          backgroundImageUrl={bg.backgroundImageUrl}
          backgroundVideoUrl={bg.backgroundVideoUrl}
          galleryUrls={preview.galleryUrls}
          invitation={{
            id: `preview-${preview.design.layout}`,
            name: preview.invitationName,
            message: preview.message,
            uniqueLink: "preview",
          }}
          event={{
            ...preview.event,
            description: preview.event.description ?? null,
            startDateRaw: preview.event.startDateRaw ?? preview.event.startDate,
            venueName: preview.event.venueName ?? null,
            landmark: preview.event.landmark ?? null,
            mapsLink: preview.event.mapsLink ?? null,
            contactPhone: preview.event.contactPhone ?? null,
            dressCode: preview.event.dressCode ?? null,
          }}
          design={preview.design}
          guestName={preview.guestName}
          fullScreen={fullScreen}
          embedded
          galleryInteractive
          rsvpRequired={false}
          memoryVaultEnabled={Boolean(memoryUploadUrl)}
          memoryUploadUrl={memoryUploadUrl}
          memoryAlbumUrl={memoryAlbumUrl}
          memoryUploadQrImageUrl={memoryUploadQrImageUrl}
          memoryAlbumTitle={memoryAlbumTitle ?? preview.event.title}
          eventId={memoryEventId ?? "preview-event"}
        />
      </div>
    </PreviewDeviceChrome>
  );

  // Compact catalogue/card embeds can sit under a parent link — keep chrome non-anchoring.
  if (compactFrame) {
    return <InvitationStaticPreviewProvider>{experience}</InvitationStaticPreviewProvider>;
  }
  return experience;
}

/** Renders invitation preview only after user taps — never auto-launches on scroll or load. */
export function LiveTemplatePreview({
  layoutSlug,
  catalogSlug,
  category,
  features,
  musicEnabled,
  variant = "card",
  className,
  showBadge = true,
  showDeviceToggle = false,
  tapToOpen = true,
  memoryUploadUrl,
  memoryAlbumUrl,
  memoryUploadQrImageUrl,
  memoryEventId,
  memoryAlbumTitle,
}: LiveTemplatePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [inView, setInView] = useState(true);
  /** Start true so above-the-fold tiles never flash blank gray before IO. */
  const [glimpseVisible, setGlimpseVisible] = useState(true);
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [containerWidth, setContainerWidth] = useState(360);
  const cfg = VARIANT_CONFIG[variant];

  const showLive = !tapToOpen || activated;

  const preview = useMemo(
    () =>
      buildLivePreviewProps(layoutSlug, category, {
        features,
        musicEnabled: musicEnabled ?? true,
        musicAutoplay: true,
        skipIntro: true,
        skipTapGate: true,
        catalogSlug: catalogSlug ?? layoutSlug,
      }),
    [layoutSlug, catalogSlug, category, features, musicEnabled]
  );

  const openingId = (preview.design.experience?.openingExperience ??
    "none") as OpeningExperienceId;
  const hasTheatricalOpen = openingId !== "none";
  const autoOpenOnActivate = previewAutoOpensReveal(openingId);
  const tapCopy = previewTapLabelForOpening(openingId);

  const hasMusic = Boolean(preview.musicSelection) && (musicEnabled ?? true);
  const portalLive = showLive;
  /**
   * Live preview must run the same opening guests get — never skip into a
   * static portal when the template has a theatrical reveal.
   * Compact thumbs without an opening still skip for snappy catalogue scroll.
   * A sealed envelope / curtain needs real screen space to read as the guest
   * choreography (seal lifts → flap opens → invite reveals) — never confine
   * that ceremony to a catalogue tile's tiny scaled mini-portal, even on
   * compact card/picker tiles.
   */
  const isFullLayout = portalLive && (cfg.interactive || hasTheatricalOpen);
  const skipRevealForLive = hasTheatricalOpen ? false : !isFullLayout;

  const frameWidth = device === "mobile" ? MOBILE_FRAME_WIDTH : DESKTOP_FRAME_WIDTH;

  const displayScale = useMemo(() => {
    if (isFullLayout) {
      const padding = 24;
      const available = Math.max(containerWidth - padding, 200);
      return Math.min(1, available / frameWidth);
    }
    if (portalLive) {
      const targetWidth = Math.max(containerWidth - 16, 200);
      return Math.min(0.58, targetWidth / MOBILE_FRAME_WIDTH);
    }
    const targetWidth = containerWidth > 0 ? containerWidth : 320;
    return Math.min(cfg.thumbScale, (targetWidth - 8) / MOBILE_FRAME_WIDTH);
  }, [isFullLayout, portalLive, containerWidth, frameWidth, cfg.thumbScale]);

  useEffect(() => {
    setActivated(false);
    pauseAllInvitationAudio();
  }, [layoutSlug]);

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setGlimpseVisible(visible);
        if (activated) {
          setInView(visible);
          if (!visible) pauseAllInvitationAudio();
        }
      },
      { rootMargin: "80px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activated]);

  useEffect(() => {
    return () => pauseAllInvitationAudio();
  }, [layoutSlug]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [device, layoutSlug, activated]);

  function openPreview(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    pauseAllInvitationAudio();
    setActivated(true);
  }

  function closePreview(e: React.MouseEvent) {
    e.stopPropagation();
    pauseAllInvitationAudio();
    setActivated(false);
  }

  const scaledFrameHeight = isFullLayout
    ? undefined
    : Math.ceil(cfg.height / Math.max(displayScale, 0.01));

  const compactPoster = variant === "picker";
  /**
   * Static thumbnail keeps the tile's compact catalogue height. Once live +
   * full-layout (theatrical envelope/curtain choreography), the stage must
   * grow to fit the real opening — pinning it to the thumbnail height is what
   * clipped the reveal / stranded it on the sealed frame behind a scrollbar.
   */
  const stageHeight = showLive && isFullLayout ? undefined : cfg.height;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden bg-[#eceae6] border-b border-slate-200/60",
        variant === "detail" && "rounded-2xl border border-slate-200/80",
        className
      )}
      style={{ height: stageHeight, minHeight: stageHeight === undefined ? cfg.height : undefined }}
    >
      {!showLive ? (
        <>
          <div className="absolute inset-0 z-10 overflow-hidden">
            {glimpseVisible && (
              <TemplatePreviewGlimpse
                layoutSlug={layoutSlug}
                catalogSlug={catalogSlug ?? layoutSlug}
                category={category}
                features={features}
                scale={cfg.thumbScale}
                compact={compactPoster}
              />
            )}
          </div>
          <PreviewTapAffordance
            compact={compactPoster}
            hasMusic={hasMusic}
            label={tapCopy.label}
            subtitle={
              autoOpenOnActivate && hasMusic
                ? `${tapCopy.subtitle ?? "Opens as guests see it"} · music begins`
                : tapCopy.subtitle
            }
            onOpen={openPreview}
            aria-label={
              autoOpenOnActivate
                ? `Tap to open live ${tapCopy.label.replace(/^Tap to open\s*/i, "").trim() || "opening"} preview`
                : "Tap to open live template preview"
            }
          />
        </>
      ) : (
        <>
          {showBadge && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
              <Play className="h-2.5 w-2.5 fill-white" />
              Live preview
            </div>
          )}
          {tapToOpen && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={cn(
                "absolute top-2 z-30 h-7 w-7 rounded-full bg-white/90 shadow-sm",
                isFullLayout ? "right-2" : "right-11"
              )}
              onClick={closePreview}
              aria-label="Close preview"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {hasMusic && inView && (
            <div
              className={cn(
                "absolute z-20 flex items-center gap-1 rounded-full bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm",
                showBadge ? "top-2 left-[7.5rem]" : "top-2 left-2"
              )}
            >
              <Music2 className="h-2.5 w-2.5" />
              Tap corner to mute
            </div>
          )}
          {showDeviceToggle && isFullLayout && (
            <div className="absolute top-2 right-10 z-20 flex gap-1 rounded-full bg-white/90 p-0.5 shadow-sm border border-slate-200/80">
              <Button
                type="button"
                size="icon"
                variant={device === "mobile" ? "default" : "ghost"}
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDevice("mobile");
                }}
                aria-label="Mobile view"
                aria-pressed={device === "mobile"}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={device === "desktop" ? "default" : "ghost"}
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDevice("desktop");
                }}
                aria-label="Desktop view"
                aria-pressed={device === "desktop"}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <div
            ref={scrollRef}
            className={cn(
              "w-full h-full overflow-x-hidden px-2 pt-2 pb-3",
              portalLive ? "overflow-y-auto overscroll-contain" : "overflow-y-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex justify-center origin-top mx-auto"
              style={{
                transform: displayScale < 1 ? `scale(${displayScale})` : undefined,
                width: isFullLayout ? frameWidth : MOBILE_FRAME_WIDTH,
                maxWidth: "100%",
                height: scaledFrameHeight,
              }}
            >
              <LivePreviewExperience
                preview={preview}
                device={isFullLayout ? device : "mobile"}
                fullScreen={isFullLayout}
                compactFrame={!isFullLayout}
                skipReveal={skipRevealForLive}
                /* Catalogue tap IS the guest gesture — skip soft intro / tap gate. */
                skipIntro
                skipTapGate
                autoOpenReveal={autoOpenOnActivate}
                musicEnabled={hasMusic && inView}
                musicAutoplay={hasMusic && inView}
                memoryUploadUrl={memoryUploadUrl}
                memoryAlbumUrl={memoryAlbumUrl}
                memoryUploadQrImageUrl={memoryUploadQrImageUrl}
                memoryEventId={memoryEventId}
                memoryAlbumTitle={memoryAlbumTitle}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
