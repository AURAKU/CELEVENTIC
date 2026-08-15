"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Download, Music2, Pause, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CeleventicImage, CeleventicVideo } from "@/components/media/celeventic-media";
import { cn } from "@/lib/utils";
import { getThankYouTemplate, type ThankYouTemplate } from "@/lib/thank-you/templates";
import type { ResolvedThankYouDesign } from "@/lib/thank-you/types";
import {
  DEFAULT_SECTION_CONFIG,
  type ThankYouGuestbookConfig,
  type ThankYouSectionConfig,
  type ThankYouSharingConfig,
} from "@/lib/thank-you/types";
import { orderedEnabledSections, parseSectionConfig } from "@/lib/thank-you/resolve-design";
import { ThankYouGuestMessages } from "@/components/thank-you/thank-you-guest-messages";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";

export interface ThankYouMemoryItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  uploaderName?: string | null;
  thumbnailUrl?: string | null;
}

export interface ThankYouPublicViewProps {
  title?: string | null;
  message?: string | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  closingMessage?: string | null;
  signatureLine?: string | null;
  hostNames?: string | null;
  eventHashtag?: string | null;
  footerText?: string | null;
  hostName: string;
  eventTitle: string;
  startDate?: string | Date | null;
  logoUrl?: string | null;
  flyerUrl?: string | null;
  hostPhotoUrl?: string | null;
  heroImageUrl?: string | null;
  signatureImageUrl?: string | null;
  audioUrl?: string | null;
  template?: ThankYouTemplate | null;
  design?: ResolvedThankYouDesign | null;
  sectionConfig?: ThankYouSectionConfig | null;
  guestbookConfig?: ThankYouGuestbookConfig | null;
  sharingConfig?: ThankYouSharingConfig | null;
  featuredMemories?: ThankYouMemoryItem[];
  eventId?: string;
  shareToken?: string | null;
  uploadUrl?: string;
  memoriesUrl?: string;
  qrImageUrl?: string;
  previewMode?: boolean;
}

function formatEventDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ThankYouPublicView(props: ThankYouPublicViewProps) {
  const {
    title,
    message,
    eyebrow,
    subtitle,
    closingMessage,
    signatureLine,
    hostNames,
    eventHashtag,
    footerText,
    hostName,
    eventTitle,
    startDate,
    logoUrl,
    flyerUrl,
    hostPhotoUrl,
    heroImageUrl,
    signatureImageUrl,
    audioUrl,
    template,
    design,
    sectionConfig,
    guestbookConfig,
    sharingConfig,
    featuredMemories = [],
    eventId,
    shareToken,
    uploadUrl,
    memoriesUrl,
    qrImageUrl,
    previewMode,
  } = props;

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const safeTemplate = template?.id ? template : getThankYouTemplate("eternal-ivory");

  const resolved = design ?? {
    themeSource: "PRESET" as const,
    templateId: safeTemplate.id,
    fontPairingId: "cormorant-inter",
    displayFontStack: "Georgia, serif",
    bodyFontStack: "system-ui, sans-serif",
    scriptFontStack: "Georgia, serif",
    eyebrowFontStack: "system-ui, sans-serif",
    backgroundColor: "#FCFAF6",
    surfaceColor: "#FFFFFF",
    textColor: "#27211E",
    mutedTextColor: "#746A64",
    accentColor: safeTemplate.accentColor,
    secondaryAccentColor: "#EADCC8",
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    overlayOpacity: 0.3,
    cardStyle: "soft" as const,
    cornerStyle: "rounded" as const,
    motionStyle: reduceMotion ? ("none" as const) : ("gentle" as const),
    contentWidth: "comfortable" as const,
    isLight: true,
    background: safeTemplate.background,
    name: safeTemplate.name,
    description: safeTemplate.description,
  };

  const sections = orderedEnabledSections(
    sectionConfig?.sections?.length
      ? sectionConfig
      : parseSectionConfig(DEFAULT_SECTION_CONFIG)
  );
  const share = {
    allowNativeShare: true,
    allowCopyLink: true,
    allowQrDownload: true,
    allowFlyerDownload: true,
    showUploadQr: true,
    showMemoryCta: true,
    showUploadCta: true,
    ...sharingConfig,
  };

  const displayTitle = title?.trim() || "Thank You for Celebrating With Us";
  const displayHosts = hostNames?.trim() || hostName;
  const dateLabel = formatEventDate(startDate);
  const widthClass =
    resolved.contentWidth === "narrow"
      ? "max-w-xl"
      : resolved.contentWidth === "wide"
        ? "max-w-4xl"
        : "max-w-2xl";
  const radius =
    resolved.cornerStyle === "sharp"
      ? "rounded-none"
      : resolved.cornerStyle === "soft"
        ? "rounded-xl"
        : "rounded-2xl";
  const motionClass =
    !reduceMotion && resolved.motionStyle !== "none"
      ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
      : "";

  async function sharePage() {
    const url = window.location.href;
    if (share.allowNativeShare && navigator.share) {
      await navigator.share({ title: displayTitle, text: message ?? undefined, url });
      return;
    }
    if (share.allowCopyLink) {
      await navigator.clipboard.writeText(url);
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const cssVars = useMemo(
    () =>
      ({
        "--ty-bg": resolved.backgroundColor,
        "--ty-surface": resolved.surfaceColor,
        "--ty-text": resolved.textColor,
        "--ty-muted": resolved.mutedTextColor,
        "--ty-accent": resolved.accentColor,
        "--ty-accent-soft": resolved.secondaryAccentColor,
        "--ty-display": resolved.displayFontStack,
        "--ty-body": resolved.bodyFontStack,
        "--ty-script": resolved.scriptFontStack,
        "--ty-eyebrow": resolved.eyebrowFontStack,
      }) as CSSProperties,
    [resolved]
  );

  return (
    <div
      className={cn("relative min-h-app-viewport overflow-x-hidden", motionClass)}
      style={{
        ...cssVars,
        backgroundColor: resolved.backgroundColor,
        color: resolved.textColor,
        fontFamily: "var(--ty-body)",
      }}
    >
      {(resolved.backgroundImageUrl || heroImageUrl) && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <CeleventicImage
            src={resolved.backgroundImageUrl || heroImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: resolved.backgroundColor,
              opacity: resolved.overlayOpacity,
            }}
          />
        </div>
      )}

      {previewMode && (
        <div className="relative z-20 bg-amber-500/90 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-950">
          Preview — not published
        </div>
      )}

      <div className={cn("relative z-10 mx-auto px-4 py-10 sm:py-14", widthClass)}>
        {sections.map((section) => {
          if (section.id === "hero") {
            return (
              <header key={section.id} className="mb-12 space-y-5 text-center">
                {logoUrl && (
                  <div className="mx-auto h-14 w-14 overflow-hidden rounded-full border border-[color:var(--ty-accent)]/40 bg-[color:var(--ty-surface)]">
                    <CeleventicImage src={logoUrl} alt={`${eventTitle} logo`} width={56} height={56} className="h-full w-full object-cover" />
                  </div>
                )}
                {(hostPhotoUrl || heroImageUrl) && (
                  <div
                    className={cn(
                      "mx-auto h-36 w-36 overflow-hidden border-4 shadow-lg sm:h-44 sm:w-44",
                      radius === "rounded-none" ? "rounded-none" : "rounded-full"
                    )}
                    style={{ borderColor: resolved.accentColor }}
                  >
                    <CeleventicImage
                      src={hostPhotoUrl || heroImageUrl}
                      alt={displayHosts}
                      width={176}
                      height={176}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                )}
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.32em]"
                  style={{ color: resolved.mutedTextColor, fontFamily: "var(--ty-eyebrow)" }}
                >
                  {eyebrow?.trim() || "WITH HEARTFELT GRATITUDE"}
                </p>
                <h1
                  className="text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-[2.75rem]"
                  style={{ fontFamily: "var(--ty-display)", color: resolved.textColor }}
                >
                  {displayTitle}
                </h1>
                {subtitle && (
                  <p className="text-base leading-relaxed sm:text-lg" style={{ color: resolved.mutedTextColor }}>
                    {subtitle}
                  </p>
                )}
                <div className="space-y-1 text-sm" style={{ color: resolved.mutedTextColor }}>
                  <p className="font-medium" style={{ color: resolved.textColor }}>
                    {displayHosts}
                  </p>
                  <p>{eventTitle}</p>
                  {dateLabel && <p>{dateLabel}</p>}
                </div>
                {audioUrl && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 gap-2 border-[color:var(--ty-accent)] text-[color:var(--ty-accent)]"
                      onClick={() => {
                        const el = audioRef.current;
                        if (!el) return;
                        if (audioPlaying) {
                          el.pause();
                          setAudioPlaying(false);
                        } else {
                          void el.play();
                          setAudioPlaying(true);
                        }
                      }}
                    >
                      {audioPlaying ? <Pause className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
                      {audioPlaying ? "Pause music" : "Play thank-you music"}
                    </Button>
                    <audio
                      ref={audioRef}
                      src={resolvePublicMediaUrl(audioUrl) || audioUrl}
                      loop
                      preload="none"
                      onEnded={() => setAudioPlaying(false)}
                    />
                  </div>
                )}
              </header>
            );
          }

          if (section.id === "gratitudeLetter" && message) {
            return (
              <section key={section.id} className="mb-12">
                <div
                  className={cn("border p-6 sm:p-8", radius)}
                  style={{
                    backgroundColor: resolved.surfaceColor,
                    borderColor: `${resolved.accentColor}33`,
                    boxShadow:
                      resolved.cardStyle === "soft"
                        ? "0 18px 40px rgba(39,33,30,0.06)"
                        : undefined,
                  }}
                >
                  {section.heading && (
                    <h2
                      className="mb-4 text-center text-xl"
                      style={{ fontFamily: "var(--ty-display)" }}
                    >
                      {section.heading}
                    </h2>
                  )}
                  <p
                    className="mx-auto max-w-[38rem] text-pretty text-[17px] leading-[1.7] sm:text-[18px] sm:leading-[1.75]"
                    style={{ color: resolved.textColor }}
                  >
                    {message}
                  </p>
                </div>
              </section>
            );
          }

          if (section.id === "flyer" && flyerUrl) {
            return (
              <section key={section.id} className="mb-12 space-y-4">
                <button
                  type="button"
                  className={cn("block w-full overflow-hidden border shadow-lg", radius)}
                  style={{ borderColor: `${resolved.accentColor}40` }}
                  onClick={() => setFlyerOpen(true)}
                >
                  <CeleventicImage
                    src={flyerUrl}
                    alt="Thank you flyer"
                    width={800}
                    height={1000}
                    className="h-auto w-full"
                    sizes="(max-width: 768px) 100vw, 672px"
                  />
                </button>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setFlyerOpen(true)}>
                    View flyer
                  </Button>
                  {share.allowFlyerDownload && (
                    <Button type="button" variant="outline" asChild>
                      <a href={resolvePublicMediaUrl(flyerUrl) || flyerUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" /> Download flyer
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            );
          }

          if (section.id === "highlightedMemories" && featuredMemories.length > 0) {
            return (
              <section key={section.id} className="mb-12 space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl" style={{ fontFamily: "var(--ty-display)" }}>
                    {section.heading || "Event Highlights"}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: resolved.mutedTextColor }}>
                    {section.description || "Selected moments from the celebration."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {featuredMemories.slice(0, 9).map((memory) => (
                    <div
                      key={memory.id}
                      className={cn("relative aspect-square overflow-hidden bg-black/5", radius)}
                    >
                      {memory.mediaType === "video" ? (
                        <CeleventicVideo
                          src={memory.mediaUrl}
                          poster={memory.thumbnailUrl ?? undefined}
                          className="h-full w-full object-cover"
                          pauseOffscreen
                          preload="none"
                        />
                      ) : (
                        <CeleventicImage
                          src={memory.thumbnailUrl || memory.mediaUrl}
                          alt={memory.caption || "Event memory"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 220px"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {memoriesUrl && share.showMemoryCta && (
                  <div className="text-center">
                    <Button asChild className="min-h-11" style={{ backgroundColor: resolved.accentColor }}>
                      <a href={memoriesUrl}>View the Album</a>
                    </Button>
                  </div>
                )}
              </section>
            );
          }

          if (section.id === "guestMessages" && eventId) {
            return (
              <section key={section.id} className="mb-12">
                <ThankYouGuestMessages
                  eventId={eventId}
                  shareToken={shareToken}
                  design={resolved}
                  guestbookConfig={guestbookConfig}
                  previewMode={previewMode}
                  radiusClass={radius}
                />
              </section>
            );
          }

          if (section.id === "memoryVault") {
            return (
              <section
                key={section.id}
                className={cn("mb-12 border p-6 text-center sm:p-8", radius)}
                style={{
                  backgroundColor: resolved.surfaceColor,
                  borderColor: `${resolved.accentColor}33`,
                }}
              >
                <h2 className="text-2xl" style={{ fontFamily: "var(--ty-display)" }}>
                  {section.heading || "Memory Vault"}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed" style={{ color: resolved.mutedTextColor }}>
                  {section.description ||
                    "Relive the celebration through the moments shared by everyone who was there."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {memoriesUrl && share.showMemoryCta && (
                    <Button asChild className="min-h-11" style={{ backgroundColor: resolved.accentColor }}>
                      <a href={memoriesUrl}>View the Album</a>
                    </Button>
                  )}
                  {uploadUrl && share.showUploadCta && (
                    <Button asChild variant="outline" className="min-h-11">
                      <a href={uploadUrl}>Share Your Photos & Videos</a>
                    </Button>
                  )}
                </div>
              </section>
            );
          }

          if (section.id === "closingSignature") {
            return (
              <section key={section.id} className="mb-12 space-y-4 text-center">
                <p className="text-[17px] leading-relaxed" style={{ color: resolved.textColor }}>
                  {closingMessage || "Thank you for being part of this celebration."}
                </p>
                {signatureImageUrl ? (
                  <div className="mx-auto h-16 w-40">
                    <CeleventicImage
                      src={signatureImageUrl}
                      alt=""
                      width={160}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <p
                    className="text-2xl"
                    style={{ fontFamily: "var(--ty-script)", color: resolved.accentColor }}
                  >
                    {signatureLine || displayHosts}
                  </p>
                )}
                {eventHashtag && (
                  <p className="text-sm font-medium" style={{ color: resolved.mutedTextColor }}>
                    {eventHashtag.startsWith("#") ? eventHashtag : `#${eventHashtag}`}
                  </p>
                )}
                {footerText && (
                  <p className="text-xs" style={{ color: resolved.mutedTextColor }}>
                    {footerText}
                  </p>
                )}
              </section>
            );
          }

          if (section.id === "shareQr") {
            return (
              <section key={section.id} className="mb-8 space-y-4">
                <div className="grid gap-3">
                  {(share.allowNativeShare || share.allowCopyLink) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12 gap-2"
                      onClick={() => void sharePage()}
                    >
                      <Share2 className="h-4 w-4" /> Share thank-you page
                    </Button>
                  )}
                  {flyerUrl && share.allowFlyerDownload && (
                    <Button type="button" variant="outline" className="min-h-12 gap-2" asChild>
                      <a href={resolvePublicMediaUrl(flyerUrl) || flyerUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" /> Download flyer
                      </a>
                    </Button>
                  )}
                </div>
                {qrImageUrl && share.showUploadQr && (
                  <div
                    className={cn("border p-6 text-center", radius)}
                    style={{
                      backgroundColor: resolved.surfaceColor,
                      borderColor: `${resolved.accentColor}33`,
                    }}
                  >
                    <p className="text-sm font-medium">Scan to upload memories</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImageUrl}
                      alt="Memory upload QR code"
                      className="mx-auto mt-3 h-40 w-40 rounded-xl bg-white p-2"
                      loading="lazy"
                    />
                    {share.allowQrDownload && (
                      <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                        <a href={`${qrImageUrl}${qrImageUrl.includes("?") ? "&" : "?"}download=1`} download>
                          <Download className="h-4 w-4" /> Download QR
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </section>
            );
          }

          // hostMedia is covered by hero photo; keep slot for future gallery of host images
          return null;
        })}

        <p
          className="pt-4 text-center text-[10px] uppercase tracking-[0.22em]"
          style={{ color: resolved.mutedTextColor, opacity: 0.7 }}
        >
          Powered by Celeventic
        </p>
      </div>

      {flyerOpen && flyerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Thank you flyer"
          onClick={() => setFlyerOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFlyerOpen(false);
          }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 min-h-11 rounded-full bg-white px-4 text-sm font-medium text-slate-900"
            onClick={() => setFlyerOpen(false)}
          >
            Close
          </button>
          <div className="max-h-[90vh] max-w-3xl overflow-auto" onClick={(event) => event.stopPropagation()}>
            <CeleventicImage
              src={flyerUrl}
              alt="Thank you flyer full view"
              width={900}
              height={1200}
              className="h-auto w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}
