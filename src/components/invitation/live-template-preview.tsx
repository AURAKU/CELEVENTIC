"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { pauseAllInvitationAudio } from "@/lib/music/invitation-audio-manager";
import { pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import { TemplatePreviewGlimpse } from "@/components/invitation/template-preview-glimpse";
import { Play, Smartphone, Monitor, Music2, X, Hand } from "lucide-react";
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
  category?: string;
  features?: string[];
  musicEnabled?: boolean;
  variant?: LivePreviewVariant;
  className?: string;
  showBadge?: boolean;
  showDeviceToggle?: boolean;
  /** When true (default), live invite only mounts after explicit user tap */
  tapToOpen?: boolean;
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

function PreviewPoster({
  compact,
  hasMusic,
  onOpen,
}: {
  compact?: boolean;
  hasMusic?: boolean;
  onOpen: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 w-full h-full",
        "bg-gradient-to-t from-black/80 via-black/45 to-black/25",
        "transition-all hover:from-black/85 hover:via-black/55 active:scale-[0.995]"
      )}
      aria-label="Tap to open live template preview"
    >
      <div className="rounded-full bg-black/45 backdrop-blur-sm p-3 shadow-lg border border-white/20">
        <Play className={cn("text-white fill-white", compact ? "h-5 w-5" : "h-7 w-7")} />
      </div>
      <span
        className={cn(
          "font-medium text-white drop-shadow-md flex items-center gap-1.5",
          compact ? "text-[10px]" : "text-xs sm:text-sm"
        )}
      >
        <Hand className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        Tap to view invitation
      </span>
      {hasMusic && (
        <span className="text-[10px] text-white/80 flex items-center gap-1">
          <Music2 className="h-3 w-3" /> Includes music
        </span>
      )}
    </button>
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
}: {
  preview: ReturnType<typeof buildLivePreviewProps>;
  device: PreviewDevice;
  fullScreen: boolean;
  compactFrame: boolean;
  skipReveal: boolean;
  musicEnabled: boolean;
  musicAutoplay: boolean;
}) {
  const bg = pageBackgroundFromDesign(preview.design);
  return (
    <PreviewDeviceChrome device={device}>
      <div
        className="relative"
        style={{ pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <PremiumInviteWrapper
          skipReveal={skipReveal}
          skipIntro
          skipTapGate
          skipAnalytics
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
          embedded={compactFrame}
          galleryInteractive
          rsvpRequired={false}
          eventId="preview-event"
        />
      </div>
    </PreviewDeviceChrome>
  );
}

/** Renders invitation preview only after user taps — never auto-launches on scroll or load. */
export function LiveTemplatePreview({
  layoutSlug,
  category,
  features,
  musicEnabled,
  variant = "card",
  className,
  showBadge = true,
  showDeviceToggle = false,
  tapToOpen = true,
}: LiveTemplatePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [inView, setInView] = useState(true);
  const [glimpseVisible, setGlimpseVisible] = useState(false);
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
      }),
    [layoutSlug, category, features, musicEnabled]
  );

  const hasMusic = Boolean(preview.musicSelection) && (musicEnabled ?? true);
  const portalLive = showLive;
  const isFullLayout = portalLive && cfg.interactive;

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

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden bg-[#eceae6] border-b border-slate-200/60",
        variant === "detail" && "rounded-2xl border border-slate-200/80",
        className
      )}
      style={{ height: cfg.height }}
    >
      {!showLive ? (
        <>
          {glimpseVisible && (
            <TemplatePreviewGlimpse
              layoutSlug={layoutSlug}
              category={category}
              features={features}
              scale={cfg.thumbScale}
              compact={compactPoster}
            />
          )}
          <PreviewPoster
            compact={compactPoster}
            hasMusic={hasMusic}
            onOpen={openPreview}
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
                skipReveal
                musicEnabled={hasMusic && inView}
                musicAutoplay={hasMusic && inView}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
