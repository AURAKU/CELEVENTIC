"use client";
/* thank-you-experience-v2 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
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
import { invitationFontVars } from "@/lib/invitation-fonts";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";

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

function normalizeIdentity(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export interface ThankYouMemoryItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  uploaderName?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string | Date | null;
}

export interface ThankYouKeepsakeExperienceProps {
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

export function ThankYouKeepsakeExperience(props: ThankYouKeepsakeExperienceProps) {
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
    allowQrDownload: false,
    allowFlyerDownload: true,
    showUploadQr: true,
    showMemoryCta: true,
    showUploadCta: true,
    ...sharingConfig,
  };

  const displayTitle = title?.trim() || "Thank You for Celebrating With Us";
  const displayHosts = (hostNames?.trim() || hostName || "").trim();
  const dateLabel = formatEventDate(startDate);
  const subtitleText = subtitle?.trim() || "";
  const hostsKey = normalizeIdentity(displayHosts);
  const showSubtitle =
    Boolean(subtitleText) &&
    normalizeIdentity(subtitleText) !== hostsKey &&
    normalizeIdentity(subtitleText) !== normalizeIdentity(displayTitle) &&
    normalizeIdentity(subtitleText) !== normalizeIdentity(eventTitle);
  const ambientPhoto = resolvePublicMediaUrl(hostPhotoUrl || heroImageUrl || flyerUrl);
  const gentleMotion = !reduceMotion && resolved.motionStyle !== "none";
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
    gentleMotion
      ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
      : "";

  async function sharePage() {
    const url = window.location.href.split("#")[0] || window.location.href;
    const shareTitle = displayHosts.trim()
      ? `Thank You — ${displayHosts.trim()}`
      : displayTitle;
    const shareText = displayHosts.trim()
      ? `With heartfelt gratitude — ${displayHosts.trim()}`
      : "With heartfelt gratitude";
    const imageCandidate =
      resolvePublicMediaUrl(hostPhotoUrl) ||
      resolvePublicMediaUrl(heroImageUrl) ||
      resolvePublicMediaUrl(flyerUrl) ||
      null;

    if (share.allowNativeShare && typeof navigator !== "undefined" && navigator.share) {
      try {
        if (imageCandidate && navigator.canShare) {
          try {
            const absoluteImage = imageCandidate.startsWith("http")
              ? imageCandidate
              : `${window.location.origin}${imageCandidate.startsWith("/") ? "" : "/"}${imageCandidate}`;
            const response = await fetch(absoluteImage);
            if (response.ok) {
              const blob = await response.blob();
              const extension = blob.type.includes("png")
                ? "png"
                : blob.type.includes("webp")
                  ? "webp"
                  : "jpg";
              const file = new File([blob], `thank-you.${extension}`, {
                type: blob.type || "image/jpeg",
              });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url,
                  files: [file],
                });
                return;
              }
            }
          } catch {
            // Fall through to link share — placecard still comes from OG tags.
          }
        }
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      }
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
      className={cn(
        "relative min-h-app-viewport overflow-x-hidden",
        invitationFontVars,
        motionClass
      )}
      style={{
        ...cssVars,
        backgroundColor: resolved.backgroundColor,
        color: resolved.textColor,
        fontFamily: "var(--ty-body)",
      }}
    >
      <ThankYouAtmosphere
        backgroundImageUrl={resolved.backgroundImageUrl || heroImageUrl}
        ambientPhotoUrl={ambientPhoto}
        backgroundColor={resolved.backgroundColor}
        accentColor={resolved.accentColor}
        overlayOpacity={resolved.overlayOpacity}
        enableSparkles={gentleMotion}
        isLight={resolved.isLight}
      />

      {previewMode && (
        <div className="relative z-20 bg-amber-500/90 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-amber-950">
          Preview, not published
        </div>
      )}

      <div className={cn("relative z-10 mx-auto px-4 py-10 sm:py-14", widthClass)}>
        {sections.map((section, sectionIndex) => {
          if (section.id === "hero") {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.04}>
                <header className="mb-12 space-y-5 text-center" data-ty-experience="keepsake-v2">
                  {logoUrl && (
                    <div className="mx-auto h-14 w-14 overflow-hidden rounded-full border border-[color:var(--ty-accent)]/40 bg-[color:var(--ty-surface)]">
                      <CeleventicImage src={logoUrl} alt={`${eventTitle} logo`} width={56} height={56} className="h-full w-full object-cover" />
                    </div>
                  )}
                  {(hostPhotoUrl || heroImageUrl) && (
                    <div className="relative mx-auto w-full max-w-[22rem] pt-2 sm:max-w-[30rem]">
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
                        style={{
                          background: `radial-gradient(circle, ${resolved.accentColor}55 0%, transparent 68%)`,
                        }}
                        aria-hidden
                      />
                      <div
                        className={cn(
                          "relative mx-auto aspect-[5/6] overflow-hidden",
                          radius === "rounded-none"
                            ? "rounded-none"
                            : "rounded-[1.75rem] sm:rounded-[2.15rem]"
                        )}
                        style={{
                          border: `2px solid ${resolved.accentColor}`,
                          boxShadow: [
                            `0 0 0 8px ${resolved.backgroundColor}`,
                            `0 0 0 10px ${resolved.accentColor}88`,
                            `0 0 0 14px ${resolved.accentColor}22`,
                            resolved.isLight
                              ? "0 28px 60px rgba(39,33,30,0.2)"
                              : "0 34px 80px rgba(0,0,0,0.55)",
                          ].join(", "),
                        }}
                      >
                        <CeleventicImage
                          src={hostPhotoUrl || heroImageUrl}
                          alt=""
                          fill
                          className={cn(
                            "object-cover object-[center_28%]",
                            gentleMotion && "cinematic-ken-burns"
                          )}
                          sizes="(max-width: 640px) 352px, 480px"
                          priority
                        />
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            boxShadow: `inset 0 0 0 1px ${resolved.accentColor}66, inset 0 0 48px rgba(0,0,0,0.22)`,
                          }}
                          aria-hidden
                        />
                        <ThankYouFrameCorners accent={resolved.accentColor} />
                      </div>
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
                  <ThankYouFlourish accent={resolved.accentColor} muted={resolved.mutedTextColor} />
                  {showSubtitle && (
                    <p className="text-base leading-relaxed sm:text-lg" style={{ color: resolved.mutedTextColor }}>
                      {subtitleText}
                    </p>
                  )}
                  {displayHosts && (
                    <p
                      className="mx-auto max-w-[18ch] text-balance pt-1 text-[1.85rem] leading-[1.15] sm:text-[2.35rem] md:text-[2.75rem]"
                      style={{
                        fontFamily: "var(--ty-script)",
                        color: resolved.accentColor,
                        textShadow: resolved.isLight
                          ? "none"
                          : "0 1px 0 rgba(255,255,255,0.06), 0 10px 28px rgba(0,0,0,0.28)",
                      }}
                    >
                      {displayHosts}
                    </p>
                  )}
                  {dateLabel && (
                    <p
                      className="text-sm tracking-[0.08em] sm:text-[15px]"
                      style={{ color: resolved.mutedTextColor, fontFamily: "var(--ty-eyebrow)" }}
                    >
                      {dateLabel}
                    </p>
                  )}
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
              </ThankYouReveal>
            );
          }

          if (section.id === "gratitudeLetter" && message) {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.1 + sectionIndex * 0.03}>
                <section className="mb-12">
                  <div
                    className={cn("relative overflow-hidden border p-6 sm:p-8", radius)}
                    style={{
                      backgroundColor:
                        resolved.cardStyle === "glass"
                          ? `${resolved.surfaceColor}cc`
                          : resolved.surfaceColor,
                      borderColor: `${resolved.accentColor}44`,
                      boxShadow:
                        resolved.cardStyle === "soft" || resolved.cardStyle === "editorial"
                          ? resolved.isLight
                            ? "0 22px 48px rgba(39,33,30,0.08)"
                            : "0 28px 60px rgba(0,0,0,0.35)"
                          : undefined,
                      backdropFilter: resolved.cardStyle === "glass" ? "blur(12px)" : undefined,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
                      style={{
                        background: `radial-gradient(ellipse at 50% -20%, ${resolved.accentColor}33 0%, transparent 70%)`,
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-3 rounded-[inherit] border opacity-35"
                      style={{ borderColor: `${resolved.accentColor}55` }}
                      aria-hidden
                    />
                    {section.heading && (
                      <h2
                        className="relative mb-4 text-center text-xl"
                        style={{ fontFamily: "var(--ty-display)" }}
                      >
                        {section.heading}
                      </h2>
                    )}
                    <ThankYouFlourish accent={resolved.accentColor} muted={resolved.mutedTextColor} className="relative mb-5" />
                    <p
                      className="relative mx-auto max-w-[36rem] text-pretty text-center text-[1.125rem] leading-[1.85] sm:text-[1.3rem] sm:leading-[1.9]"
                      style={{
                        fontFamily: "var(--ty-display)",
                        color: resolved.textColor,
                        fontWeight: 400,
                        letterSpacing: "0.01em",
                        fontStyle: "italic",
                      }}
                    >
                      {message}
                    </p>
                  </div>
                </section>
              </ThankYouReveal>
            );
          }

          if (section.id === "flyer" && flyerUrl) {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.12 + sectionIndex * 0.03}>
                <section className="mb-12 space-y-4">
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
              </ThankYouReveal>
            );
          }

          if (section.id === "highlightedMemories" && featuredMemories.length > 0) {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.14 + sectionIndex * 0.03}>
                <section className="mb-12 space-y-5">
                  <div className="text-center">
                    <h2 className="text-2xl" style={{ fontFamily: "var(--ty-display)" }}>
                      {section.heading || "Event Highlights"}
                    </h2>
                    {section.description?.trim() ? (
                      <p className="mt-2 text-sm" style={{ color: resolved.mutedTextColor }}>
                        {section.description.trim()}
                      </p>
                    ) : null}
                  </div>
                  <ThankYouHighlightsReel
                    memories={featuredMemories}
                    accentColor={resolved.accentColor}
                    backgroundColor={resolved.backgroundColor}
                    radiusClass={radius}
                    reduceMotion={reduceMotion}
                  />
                  {memoriesUrl && share.showMemoryCta && (
                    <div className="text-center">
                      <Button asChild className="min-h-11" style={{ backgroundColor: resolved.accentColor }}>
                        <a href={memoriesUrl}>View the Album</a>
                      </Button>
                    </div>
                  )}
                </section>
              </ThankYouReveal>
            );
          }

          if (section.id === "guestMessages" && eventId) {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.16 + sectionIndex * 0.03}>
                <section className="mb-12">
                  <ThankYouGuestMessages
                    eventId={eventId}
                    shareToken={shareToken}
                    design={resolved}
                    guestbookConfig={guestbookConfig}
                    previewMode={previewMode}
                    radiusClass={radius}
                  />
                </section>
              </ThankYouReveal>
            );
          }

          if (section.id === "memoryVault") {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.18 + sectionIndex * 0.03}>
                <section
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
              </ThankYouReveal>
            );
          }

          if (section.id === "closingSignature") {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.2 + sectionIndex * 0.03}>
                <section className="mb-12 space-y-4 text-center">
                  <ThankYouFlourish accent={resolved.accentColor} muted={resolved.mutedTextColor} />
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
              </ThankYouReveal>
            );
          }

          if (section.id === "shareQr") {
            return (
              <ThankYouReveal key={section.id} enabled={gentleMotion} delay={0.22 + sectionIndex * 0.03}>
                <section className="mb-8 space-y-4">
                  <div className="grid gap-3">
                    {(share.allowNativeShare || share.allowCopyLink) && (
                      <Button
                        type="button"
                        className="min-h-12 w-full gap-2.5 text-[15px] font-semibold tracking-wide"
                        style={{
                          backgroundColor: resolved.accentColor,
                          color: resolved.isLight ? "#1a1a1a" : "#14261C",
                        }}
                        onClick={() => void sharePage()}
                      >
                        <Share2 className="h-4 w-4" strokeWidth={2.25} />
                        Share
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
                      <p className="text-sm font-medium">
                        {uploadUrl ? "Tap or scan to upload memories" : "Scan to upload memories"}
                      </p>
                      {uploadUrl ? (
                        <a
                          href={uploadUrl}
                          className="mx-auto mt-3 inline-block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ty-accent)] focus-visible:ring-offset-2"
                          aria-label="Open memory upload page"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrImageUrl}
                            alt="Memory upload QR code"
                            className="h-40 w-40 rounded-xl bg-white p-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrImageUrl}
                            alt="Memory upload QR code"
                            className="mx-auto mt-3 h-40 w-40 rounded-xl bg-white p-2"
                            loading="lazy"
                          />
                        </>
                      )}
                    </div>
                  )}
                </section>
              </ThankYouReveal>
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

const HIGHLIGHTS_SLIDE_MS = 4200;

function highlightFrameStyle(accentColor: string, backgroundColor: string) {
  return {
    border: `1.5px solid ${accentColor}66`,
    boxShadow: [
      `0 0 0 6px ${backgroundColor}`,
      `0 0 0 7px ${accentColor}40`,
      "0 28px 60px rgba(0,0,0,0.35)",
    ].join(", "),
  } as const;
}

function ThankYouHighlightMedia({
  memory,
  priority,
  kenBurns,
}: {
  memory: ThankYouMemoryItem;
  priority?: boolean;
  kenBurns?: boolean;
}) {
  if (memory.mediaType === "video") {
    return (
      <CeleventicVideo
        src={memory.mediaUrl}
        poster={memory.thumbnailUrl ?? undefined}
        className="h-full w-full object-cover"
        pauseOffscreen
        preload={priority ? "metadata" : "none"}
      />
    );
  }
  return (
    <CeleventicImage
      src={memory.thumbnailUrl || memory.mediaUrl}
      alt={memory.caption || "Event memory"}
      fill
      className={cn(
        "object-cover transition-transform duration-[4200ms] ease-out",
        kenBurns ? "scale-105" : "scale-100"
      )}
      sizes="(max-width: 768px) 100vw, 768px"
      priority={priority}
    />
  );
}

function ThankYouHighlightsReel({
  memories,
  accentColor,
  backgroundColor,
  radiusClass,
  reduceMotion,
}: {
  memories: ThankYouMemoryItem[];
  accentColor: string;
  backgroundColor: string;
  radiusClass: string;
  reduceMotion: boolean;
}) {
  // Chronological so restored/older memories are not buried behind the newest upload.
  const slides = [...memories]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, 24);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[index] ?? slides[0];

  useEffect(() => {
    if (reduceMotion || paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, HIGHLIGHTS_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  if (!active) return null;

  const frame = highlightFrameStyle(accentColor, backgroundColor);

  // Few photos: show them all at once so nothing feels "missing".
  if (slides.length >= 2 && slides.length <= 6) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            "grid gap-3",
            slides.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {slides.map((memory, slideIndex) => (
            <div
              key={memory.id}
              className={cn("relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]", radiusClass)}
              style={frame}
            >
              <ThankYouHighlightMedia
                memory={memory}
                priority={slideIndex < 2}
                kenBurns={!reduceMotion && slideIndex === 0}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4) 100%)",
                }}
              />
              {memory.caption?.trim() ? (
                <p
                  className="absolute bottom-3 left-3 right-3 text-center text-xs text-white/95 sm:text-sm"
                  style={{
                    fontFamily: "var(--ty-display)",
                    textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                  }}
                >
                  {memory.caption.trim()}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <p
          className="mt-3 text-center text-xs tracking-[0.18em] uppercase"
          style={{ color: accentColor, opacity: 0.85 }}
        >
          {slides.length} highlights
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className={cn("relative aspect-[16/10] overflow-hidden sm:aspect-[16/9]", radiusClass)}
        style={frame}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {slides.map((memory, slideIndex) => {
          const isActive = slideIndex === index;
          return (
            <div
              key={memory.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                isActive ? "opacity-100" : "opacity-0"
              )}
              aria-hidden={!isActive}
            >
              <ThankYouHighlightMedia
                memory={memory}
                priority={slideIndex === 0}
                kenBurns={isActive && !reduceMotion}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.45) 100%)",
                }}
              />
            </div>
          );
        })}

        {active.caption?.trim() ? (
          <p
            className="absolute bottom-4 left-4 right-4 text-center text-sm text-white/95 sm:text-base"
            style={{ fontFamily: "var(--ty-display)", textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
          >
            {active.caption.trim()}
          </p>
        ) : null}

        {slides.length > 1 ? (
          <p
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            {index + 1} / {slides.length}
          </p>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((memory, slideIndex) => (
            <button
              key={memory.id}
              type="button"
              aria-label={`Show highlight ${slideIndex + 1}`}
              aria-current={slideIndex === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                slideIndex === index ? "w-7" : "w-1.5 opacity-45 hover:opacity-80"
              )}
              style={{ backgroundColor: accentColor }}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      ) : null}
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

function ThankYouAtmosphere({
  backgroundImageUrl,
  ambientPhotoUrl,
  backgroundColor,
  accentColor,
  overlayOpacity,
  enableSparkles,
  isLight,
}: {
  backgroundImageUrl?: string | null;
  ambientPhotoUrl?: string | null;
  backgroundColor: string;
  accentColor: string;
  overlayOpacity: number;
  enableSparkles: boolean;
  isLight: boolean;
}) {
  const photo = backgroundImageUrl || ambientPhotoUrl;
  const sparks = enableSparkles
    ? [
        { top: "12%", left: "18%", size: 3, delay: "0s" },
        { top: "22%", left: "78%", size: 2, delay: "0.8s" },
        { top: "48%", left: "12%", size: 2, delay: "1.4s" },
        { top: "62%", left: "88%", size: 3, delay: "0.4s" },
        { top: "78%", left: "28%", size: 2, delay: "1.1s" },
        { top: "34%", left: "52%", size: 2, delay: "1.8s" },
      ]
    : [];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {photo ? (
        <>
          <CeleventicImage
            src={photo}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-40"
            sizes="100vw"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor,
              opacity: Math.min(0.92, Math.max(0.55, overlayOpacity + 0.35)),
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 50% 12%, ${accentColor}22 0%, transparent 42%),
              radial-gradient(ellipse at 18% 78%, ${accentColor}14 0%, transparent 36%),
              radial-gradient(ellipse at 82% 70%, ${isLight ? accentColor : "#C41E3A"}12 0%, transparent 34%),
              ${backgroundColor}
            `,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? `linear-gradient(180deg, ${backgroundColor}aa 0%, transparent 28%, transparent 62%, ${backgroundColor}f0 100%)`
            : `linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 34%, transparent 58%, rgba(0,0,0,0.45) 100%)`,
        }}
      />
      <div className="absolute inset-0 cinematic-vignette opacity-80" />
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="absolute rounded-full opacity-70 motion-safe:animate-pulse"
          style={{
            top: spark.top,
            left: spark.left,
            width: spark.size,
            height: spark.size,
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
            animationDelay: spark.delay,
          }}
        />
      ))}
    </div>
  );
}

function ThankYouReveal({
  children,
  enabled,
  delay = 0,
}: {
  children: ReactNode;
  enabled: boolean;
  delay?: number;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function ThankYouFlourish({
  accent,
  muted,
  className,
}: {
  accent: string;
  muted: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)} aria-hidden>
      <span className="h-px w-10 sm:w-14" style={{ backgroundColor: `${accent}66` }} />
      <span className="text-[11px] leading-none" style={{ color: accent }}>
        ✦
      </span>
      <span className="h-px w-10 sm:w-14" style={{ backgroundColor: `${muted}55` }} />
    </div>
  );
}

function ThankYouFrameCorners({ accent }: { accent: string }) {
  const corner =
    "pointer-events-none absolute h-5 w-5 sm:h-6 sm:w-6 border-solid opacity-90";
  return (
    <>
      <span
        className={cn(corner, "left-2 top-2 border-l-2 border-t-2 rounded-tl-md")}
        style={{ borderColor: accent }}
        aria-hidden
      />
      <span
        className={cn(corner, "right-2 top-2 border-r-2 border-t-2 rounded-tr-md")}
        style={{ borderColor: accent }}
        aria-hidden
      />
      <span
        className={cn(corner, "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-md")}
        style={{ borderColor: accent }}
        aria-hidden
      />
      <span
        className={cn(corner, "bottom-2 right-2 border-b-2 border-r-2 rounded-br-md")}
        style={{ borderColor: accent }}
        aria-hidden
      />
    </>
  );
}

/** @deprecated Prefer ThankYouKeepsakeExperience */
export const ThankYouPublicView = ThankYouKeepsakeExperience;
