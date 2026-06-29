"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { Play, Smartphone, Monitor, Music2 } from "lucide-react";
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
    autoScroll: boolean;
    interactive: boolean;
  }
> = {
  picker: { height: 132, thumbScale: 0.32, autoScroll: true, interactive: false },
  card: { height: 248, thumbScale: 0.36, autoScroll: true, interactive: false },
  hero: { height: 580, thumbScale: 1, autoScroll: false, interactive: true },
  detail: { height: 700, thumbScale: 1, autoScroll: false, interactive: true },
};

interface LiveTemplatePreviewProps {
  layoutSlug: string;
  category?: string;
  features?: string[];
  musicEnabled?: boolean;
  variant?: LivePreviewVariant;
  lazy?: boolean;
  className?: string;
  showBadge?: boolean;
  showDeviceToggle?: boolean;
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
  interactive,
  skipReveal,
}: {
  preview: ReturnType<typeof buildLivePreviewProps>;
  device: PreviewDevice;
  interactive: boolean;
  skipReveal: boolean;
}) {
  return (
    <PreviewDeviceChrome device={device}>
      <div
        className="relative"
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      >
        <PremiumInviteWrapper
          skipReveal={skipReveal}
          skipTapGate={preview.skipTapGate ?? !interactive}
          musicEnabled={Boolean(preview.musicSelection)}
          musicSelection={preview.musicSelection}
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
          fullScreen={interactive}
          embedded={!interactive}
          rsvpRequired={false}
          eventId="preview-event"
        />
      </div>
    </PreviewDeviceChrome>
  );
}

/** Renders the full guest invitation experience with dummy event data — not a static gradient. */
export function LiveTemplatePreview({
  layoutSlug,
  category,
  features,
  musicEnabled,
  variant = "card",
  lazy = true,
  className,
  showBadge = true,
  showDeviceToggle = false,
}: LiveTemplatePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [containerWidth, setContainerWidth] = useState(360);
  const cfg = VARIANT_CONFIG[variant];

  const preview = useMemo(
    () =>
      buildLivePreviewProps(layoutSlug, category, {
        features,
        musicEnabled: musicEnabled ?? true,
        skipIntro: !cfg.interactive,
        skipTapGate: !cfg.interactive,
      }),
    [layoutSlug, category, features, musicEnabled, cfg.interactive]
  );

  const hasMusic = Boolean(preview.musicSelection);
  const isInteractive = cfg.interactive;

  const frameWidth = device === "mobile" ? MOBILE_FRAME_WIDTH : DESKTOP_FRAME_WIDTH;

  const displayScale = useMemo(() => {
    if (isInteractive) {
      const padding = 24;
      const available = Math.max(containerWidth - padding, 200);
      return Math.min(1, available / frameWidth);
    }
    const targetWidth = containerWidth > 0 ? containerWidth : 320;
    return Math.min(cfg.thumbScale, (targetWidth - 8) / MOBILE_FRAME_WIDTH);
  }, [isInteractive, containerWidth, frameWidth, cfg.thumbScale]);

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
    if (!lazy || !rootRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.05 }
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [device, layoutSlug]);

  useEffect(() => {
    if (!visible || !cfg.autoScroll || !scrollRef.current) return;
    const el = scrollRef.current;
    let frame = 0;
    let direction = 1;
    let paused = false;
    let pauseUntil = 0;

    const tick = () => {
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 4) return;

      const now = Date.now();
      if (now < pauseUntil) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (!paused) {
        el.scrollTop += direction * 0.4;
        if (el.scrollTop >= max - 1) {
          direction = -1;
          pauseUntil = now + 1400;
        } else if (el.scrollTop <= 0) {
          direction = 1;
          pauseUntil = now + 1400;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
    };
  }, [visible, cfg.autoScroll, layoutSlug, displayScale]);

  const scaledFrameHeight = isInteractive
    ? undefined
    : Math.ceil(cfg.height / Math.max(displayScale, 0.01));

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
      {!visible ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200/80 to-slate-100" />
      ) : (
        <>
          {showBadge && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
              <Play className="h-2.5 w-2.5 fill-white" />
              Live preview
            </div>
          )}
          {hasMusic && (
            <div
              className={cn(
                "absolute z-20 flex items-center gap-1 rounded-full bg-[#0B8A83]/90 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm",
                showBadge ? "top-2 left-[7.5rem]" : "top-2 left-2"
              )}
            >
              <Music2 className="h-2.5 w-2.5" />
              {isInteractive ? "Music included" : "With music"}
            </div>
          )}
          {showDeviceToggle && isInteractive && (
            <div className="absolute top-2 right-2 z-20 flex gap-1 rounded-full bg-white/90 p-0.5 shadow-sm border border-slate-200/80">
              <Button
                type="button"
                size="icon"
                variant={device === "mobile" ? "default" : "ghost"}
                className="h-7 w-7"
                onClick={() => setDevice("mobile")}
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
                onClick={() => setDevice("desktop")}
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
              isInteractive ? "overflow-y-auto overscroll-contain" : "overflow-y-hidden"
            )}
          >
            <div
              className="flex justify-center origin-top mx-auto"
              style={{
                transform: displayScale < 1 ? `scale(${displayScale})` : undefined,
                width: isInteractive ? frameWidth : MOBILE_FRAME_WIDTH,
                maxWidth: "100%",
                height: scaledFrameHeight,
              }}
            >
              <LivePreviewExperience
                preview={preview}
                device={isInteractive ? device : "mobile"}
                interactive={isInteractive}
                skipReveal={!isInteractive}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
