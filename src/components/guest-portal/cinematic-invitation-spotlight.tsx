"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, MapPin, Clock, Shirt, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { CountdownDisplay } from "@/components/experience/countdown-display";
import { InvitationGalleryDisplay } from "@/components/invitation/invitation-gallery-display";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { AddToCalendarButton } from "@/components/guest-portal/add-to-calendar-button";
import { AgiFooter } from "@/components/agi-engine/agi-badge";
import { ParticleEnvironment } from "@/components/experience/particle-environment";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import type { EventExperienceConfig } from "@/lib/experience/experience-types";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { cn } from "@/lib/utils";
import { UploadedMedia } from "@/components/media/uploaded-media";

interface CinematicInvitationSpotlightProps extends PremiumInviteExperienceProps {
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
  admissionQrToken?: string | null;
  guestQrToken?: string | null;
  seatLookupUrl?: string | null;
  seatQrDataUrl?: string | null;
  experienceConfig?: EventExperienceConfig;
  embedded?: boolean;
}

type SceneDef = {
  id: string;
  durationMs: number;
  content: React.ReactNode;
};

const SLIDE_MS = 7200;

export function CinematicInvitationSpotlight(props: CinematicInvitationSpotlightProps) {
  const { t, locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  const localized = props.localizedVersions?.[locale];
  const displayEvent = {
    ...props.event,
    title: localized?.eventTitle ?? props.event.title,
    description: localized?.story ?? props.event.description,
    dressCode: localized?.dressCode ?? props.event.dressCode,
    venueName: localized?.venueName ?? props.event.venueName,
    landmark: localized?.landmark ?? props.event.landmark,
    hostName: localized?.hostName ?? props.event.hostName,
  };

  const { colors, fonts } = props.design;
  const accent = colors?.accent ?? "#0B8A83";
  const secondary = colors?.secondary ?? "#D4A63A";
  const textColor = colors?.text ?? "#F5F0E6";
  const bg = colors?.background ?? "#0a0a0a";
  const { name1, name2 } = parseCoupleNames(displayEvent.title, displayEvent.hostName);
  const dateParts = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const environmentId = props.experienceConfig?.environment ?? "none";
  const countdownStyle = props.experienceConfig?.countdownStyle ?? "classic";
  const showRsvp = props.rsvpRequired !== false;

  const galleryItems = useMemo(
    () =>
      (props.galleryUrls ?? []).map((url, i) => ({
        id: `g-${i}`,
        url,
        type: (/\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image") as "image" | "video",
      })),
    [props.galleryUrls]
  );

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: displayEvent.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayEvent.title, shareUrl]);

  const scenes = useMemo(() => {
    const list: SceneDef[] = [];

    list.push({
      id: "hero",
      durationMs: SLIDE_MS,
      content: (
        <div className="flex flex-col items-center justify-center text-center px-8 max-w-lg mx-auto">
          <p
            className="uppercase tracking-[0.4em] text-xs opacity-70 mb-6"
            style={{ color: secondary, fontFamily: fonts?.body }}
          >
            {props.design.introText ?? "You are invited"}
          </p>
          <h1
            className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.08em] leading-tight"
            style={{ color: colors?.primary ?? textColor }}
          >
            {name1}
            {name2 && (
              <>
                <span className="block my-3 text-lg opacity-50">&</span>
                {name2}
              </>
            )}
          </h1>
          <p
            className="mt-8 font-[family-name:var(--font-cinzel)] tracking-[0.3em] text-sm sm:text-base"
            style={{ color: secondary }}
          >
            {String(dateParts.day).padStart(2, "0")} · {dateParts.monthShort.toUpperCase()} · {dateParts.year}
          </p>
          <p className="mt-2 text-sm opacity-60">{dateParts.time}</p>
        </div>
      ),
    });

    if (props.guestName) {
      list.push({
        id: "welcome",
        durationMs: SLIDE_MS,
        content: (
          <div className="text-center px-8 max-w-md mx-auto">
            <p className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: accent }}>
              Welcome
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold" style={{ color: colors?.primary ?? textColor }}>
              {t("invite.welcome", { name: props.guestName })}
            </h2>
            <p className="mt-4 text-sm opacity-70">Hosted by {displayEvent.hostName}</p>
          </div>
        ),
      });
    }

    list.push({
      id: "countdown",
      durationMs: SLIDE_MS,
      content: (
        <div className="px-6">
          <CountdownDisplay
            targetIso={props.event.startDateRaw ?? props.event.startDate}
            label={t("invite.countdown")}
            begunLabel={t("invite.celebration_begun")}
            style={countdownStyle}
          />
        </div>
      ),
    });

    if (displayEvent.description) {
      list.push({
        id: "story",
        durationMs: SLIDE_MS + 2000,
        content: (
          <div className="max-w-md mx-auto px-8 text-center">
            <p className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: accent }}>
              {t("invite.our_story")}
            </p>
            <p className="text-base sm:text-lg leading-relaxed opacity-90 whitespace-pre-line font-[family-name:var(--font-cormorant)] italic">
              {displayEvent.description}
            </p>
          </div>
        ),
      });
    }

    if (displayEvent.venueName || displayEvent.landmark) {
      list.push({
        id: "venue",
        durationMs: SLIDE_MS,
        content: (
          <div className="max-w-md mx-auto px-8 text-center space-y-5">
            <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
              Venue
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: colors?.primary ?? textColor }}>
              {displayEvent.venueName}
            </h2>
            {displayEvent.landmark && <p className="text-sm opacity-70">{displayEvent.landmark}</p>}
            <p className="flex items-center justify-center gap-2 text-sm opacity-80">
              <Clock className="h-4 w-4" style={{ color: secondary }} />
              {displayEvent.startDate}
            </p>
            {displayEvent.dressCode && (
              <p className="flex items-center justify-center gap-2 text-sm opacity-80">
                <Shirt className="h-4 w-4" style={{ color: secondary }} />
                {displayEvent.dressCode}
              </p>
            )}
            {props.event.mapsLink && (
              <Button variant="outline" size="sm" asChild className="border-white/30 text-white hover:bg-white/10 mt-4">
                <a href={props.event.mapsLink} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4" /> Get Directions
                </a>
              </Button>
            )}
          </div>
        ),
      });
    }

    if (galleryItems.length > 0) {
      list.push({
        id: "gallery",
        durationMs: SLIDE_MS + 4000,
        content: (
          <div className="w-full max-w-lg mx-auto px-6">
            <InvitationGalleryDisplay
              items={galleryItems}
              settings={{ style: "fade-carousel", autoplay: true, slideDurationSec: 4 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
            />
          </div>
        ),
      });
    }

    if (showRsvp) {
      list.push({
        id: "rsvp",
        durationMs: SLIDE_MS + 3000,
        content: (
          <div className="w-full max-w-md mx-auto px-6">
            <p className="text-center text-xs uppercase tracking-[0.35em] mb-6" style={{ color: accent }}>
              {t("rsvp.title")}
            </p>
            <div className="rounded-2xl border border-white/15 bg-black/30 backdrop-blur-xl p-6">
              <InvitationRsvpPanel
                invitationId={props.invitation.id}
                guestId={props.guestId}
                guestName={props.guestName}
                accentColor={accent}
                variant="dark"
                buttonStyle={props.design.studio?.buttonStyle}
              />
            </div>
          </div>
        ),
      });
    }

    if (props.admissionQrDataUrl || props.qrDataUrl || props.seatQrDataUrl) {
      list.push({
        id: "pass",
        durationMs: SLIDE_MS + 2000,
        content: (
          <div className="max-w-sm mx-auto px-6 text-center space-y-6">
            <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
              Your Pass
            </p>
            {props.admissionQrDataUrl && (
              <BrandedQrImage
                src={props.admissionQrDataUrl}
                token={props.admissionQrToken ?? undefined}
                size={240}
                mode="pass"
                allowFullscreen
                guestName={props.guestName ?? undefined}
                caption="Show at the gate"
                showDownload
              />
            )}
            {props.seatQrDataUrl && props.seatLookupUrl && (
              <BrandedQrImage src={props.seatQrDataUrl} size={140} showDownload caption="Your seat" />
            )}
            {props.qrDataUrl && !props.admissionQrDataUrl && (
              <BrandedQrImage src={props.qrDataUrl} token={props.guestQrToken ?? undefined} size={160} showDownload={false} />
            )}
          </div>
        ),
      });
    }

    list.push({
      id: "thanks",
      durationMs: SLIDE_MS,
      content: (
        <div className="max-w-md mx-auto px-8 text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.35em]" style={{ color: secondary }}>
            With love
          </p>
          <p className="font-display text-xl sm:text-2xl leading-relaxed opacity-95">
            {props.experienceConfig?.thankYouMessage ??
              "Thank you for being part of our celebration. We cannot wait to share this moment with you."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <AddToCalendarButton
              title={displayEvent.title}
              startDateRaw={props.event.startDateRaw}
              venue={displayEvent.venueName ?? undefined}
              description={displayEvent.description ?? undefined}
            />
            <Button variant="outline" size="sm" onClick={handleShare} className="border-white/30 text-white hover:bg-white/10">
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? t("invite.copied") : t("invite.share")}
            </Button>
          </div>
          <div className="pt-8 opacity-60">
            <p className="text-xs">
              <Link href="/" className="hover:underline" style={{ color: accent }}>
                Celeventic
              </Link>{" "}
              — {t("invite.tagline")}
            </p>
            <AgiFooter />
          </div>
        </div>
      ),
    });

    return list;
  }, [
    props,
    displayEvent,
    name1,
    name2,
    dateParts,
    colors,
    fonts,
    accent,
    secondary,
    textColor,
    galleryItems,
    showRsvp,
    countdownStyle,
    copied,
    locale,
    t,
    handleShare,
  ]);

  const total = scenes.length;
  const current = scenes[index] ?? scenes[0];
  const progress = total > 0 ? (index + 1) / total : 0;

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setTimeout(next, current?.durationMs ?? SLIDE_MS);
    return () => clearTimeout(id);
  }, [index, paused, total, next, current?.durationMs]);

  const bgMedia = props.backgroundVideoUrl || props.backgroundImageUrl || props.event.coverImageUrl;

  return (
    <div
      className={cn(
        "w-full overflow-hidden cinematic-spotlight-root",
        props.embedded ? "relative min-h-[520px]" : "fixed inset-0 z-[50] min-h-[100dvh]"
      )}
      style={{ background: typeof bg === "string" && (bg.startsWith("rgba") || bg.startsWith("linear")) ? bg : bg }}
    >
      <ParticleEnvironment presetId={environmentId} intensity="medium" />

      <div className="absolute inset-0 z-0">
        {props.backgroundVideoUrl ? (
          <UploadedMedia
            src={props.backgroundVideoUrl}
            video
            className="h-full w-full object-cover cinematic-ken-burns"
          />
        ) : bgMedia ? (
          <UploadedMedia src={bgMedia} alt="" className="h-full w-full object-cover cinematic-ken-burns" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${accent}44 0%, transparent 55%), linear-gradient(180deg, ${bg} 0%, #000 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/75" />
        <div className="absolute inset-0 cinematic-vignette pointer-events-none" />
      </div>

      <div className={cn("relative z-10 flex flex-col safe-area-pb", props.embedded ? "min-h-[520px]" : "min-h-[100dvh]")}>
        <div className="flex-1 flex items-center justify-center relative">
          <button type="button" aria-label="Previous" className="absolute left-0 top-0 bottom-0 w-1/4 z-20 touch-manipulation" onClick={prev} />
          <button type="button" aria-label="Next" className="absolute right-0 top-0 bottom-0 w-1/4 z-20 touch-manipulation" onClick={next} />

          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id}
              initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.03, filter: "blur(6px)" }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
              style={{ color: textColor }}
            >
              {current?.content}
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="absolute bottom-24 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md touch-manipulation"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-3">
          <div className="h-0.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${secondary})` }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Scene ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300 touch-manipulation",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
          <div className="flex justify-center gap-4 text-white/40">
            <button type="button" onClick={prev} className="p-2 touch-manipulation hover:text-white/70" aria-label="Previous scene">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={next} className="p-2 touch-manipulation hover:text-white/70" aria-label="Next scene">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
