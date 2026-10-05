"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Menu, Phone, X } from "lucide-react";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { useCountdown } from "@/hooks/use-countdown";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import { WhatsAppIcon } from "@/components/memory/icons/social-brand-icons";
import {
  AURELIA_HERO_FALLBACK,
  AURELIA_QR_CENTER,
  SERAPHINE_HERO_FALLBACK,
  AURELIA_COUPLE_GALLERY,
  SERAPHINE_LOOKBOOK_GALLERY,
  SERAPHINE_GUEST_OUTFIT_SLIDES,
  SERAPHINE_JOURNEY_CHAPTERS,
  SERAPHINE_LAYOUT_SLUG,
  SERAPHINE_MONOGRAM,
  SERAPHINE_MONOGRAM_CREST,
  SERAPHINE_TRADITIONAL_MAP_IMAGE,
  SERAPHINE_WHITE_MAP_IMAGE,
  aureliaDistinctVenues,
  aureliaFamilyDefaults,
  aureliaGuestPhoneLinks,
  aureliaNavItems,
  aureliaSectionVisible,
  aureliaTokenStyle,
  mergeAureliaWedding,
  resolveAureliaCountdownIso,
  resolveAureliaHeroImage,
  resolveAureliaCoupleAlbum,
  resolveAureliaJourneyMoments,
} from "@/lib/experience/aurelia-editorial";
import { buildDirectionsUrl, toGoogleMapsDirectionsHref } from "@/lib/invitation/maps-utils";
import { calendarEventLocation, toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { EVENT_TIME_ZONE } from "@/lib/constants";
import { invitationFontVars } from "@/lib/invitation-fonts";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { AureliaCoupleAlbum } from "./aurelia-couple-album";
import { AureliaGiftCheckout } from "./aurelia-gift-checkout";
import { AureliaJourneyMoments } from "./aurelia-journey-moments";
import { AureliaHeroCalendar } from "./aurelia-hero-calendar";
import { SeraphineHourglass } from "./seraphine-hourglass";
import { AureliaMemoryAlbum } from "./aurelia-memory-album";
import { isOrganizerUploadedQrCenter } from "@/lib/qr/qr-center-resolution";
import styles from "./aurelia-editorial-wedding.module.css";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function splitMonogram(value: string, partnerOne = "", partnerTwo = ""): [string, string] {
  const fromOne = partnerOne.trim().charAt(0);
  const fromTwo = partnerTwo.trim().charAt(0);
  if (fromOne && fromTwo) {
    return [fromOne.toUpperCase(), fromTwo.toUpperCase()];
  }
  const parts = value
    .split(/\s*&\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const one = (parts[0] || "E").charAt(0).toUpperCase() || "E";
  const two = (parts[1] || one).charAt(0).toUpperCase() || one;
  return [one, two];
}


type OutfitSlide = {
  id: string;
  label: string;
  src: string;
  alt: string;
};

function OutfitLookbookDeck({
  id,
  slides,
}: {
  id: string;
  slides: readonly OutfitSlide[];
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const locked = useRef<"x" | "y" | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const last = Math.max(slides.length - 1, 0);
  const current = slides[index] ?? slides[0];
  const nextSlide = slides[index + 1];

  const goTo = useCallback((next: number) => {
    setIndex(Math.min(Math.max(next, 0), last));
    setDrag(0);
  }, [last]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    startY.current = event.clientY;
    locked.current = null;
    setDrag(0);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (locked.current === "x") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    if (locked.current !== "x") return;
    event.preventDefault();
    const width = viewportRef.current?.offsetWidth ?? 1;
    const max = width * 0.92;
    const next = Math.min(Math.max(dx, -max), max);
    if ((index === 0 && next > 0) || (index === last && next < 0)) {
      setDrag(next * 0.35);
      return;
    }
    setDrag(next);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = event.clientX - startX.current;
    const width = viewportRef.current?.offsetWidth ?? 320;
    const axis = locked.current;
    startX.current = null;
    locked.current = null;
    setDrag(0);
    if (axis !== "x") return;
    if (dx <= -width * 0.18) goTo(index + 1);
    else if (dx >= width * 0.18) goTo(index - 1);
  };

  if (!current) return null;

  return (
    <figure id={id} className={styles.outfitPanel}>
      <div className={styles.outfitTabs} role="tablist" aria-label="Guest lookbook">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === slideIndex}
            className={`${styles.outfitTab}${index === slideIndex ? ` ${styles.outfitTabActive}` : ""}`}
            onClick={() => goTo(slideIndex)}
          >
            {slide.label}
          </button>
        ))}
      </div>
      <div
        ref={viewportRef}
        className={styles.outfitViewport}
        data-testid="seraphine-outfit-deck"
        role="group"
        aria-roledescription="carousel"
        aria-label="Guest outfit looks"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(index + 1);
          if (event.key === "ArrowLeft") goTo(index - 1);
        }}
      >
        <div
          className={styles.outfitTrack}
          style={{
            transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
            transition: drag ? "none" : undefined,
          }}
        >
          {slides.map((slide) => (
            <div className={styles.outfitSlide} key={slide.id} aria-hidden={current.id !== slide.id}>
              <div className={styles.outfitMat}>
                <img
                  className={styles.outfitImage}
                  src={slide.src}
                  alt={slide.alt}
                  width={768}
                  height={1024}
                  decoding="async"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.outfitNav} ${styles.outfitNavPrev}`}
          aria-label={index === 0 ? "Previous look" : `View ${slides[index - 1]?.label} look`}
          disabled={index === 0}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={`${styles.outfitNav} ${styles.outfitNavNext}`}
          aria-label={nextSlide ? `View ${nextSlide.label} look` : "Next look"}
          disabled={index === last}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => goTo(index + 1)}
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>
      <p className={styles.outfitHint}>
        {index + 1} of {slides.length} · swipe to see every look
      </p>
      <figcaption className={styles.outfitCaption}>
        A lookbook for colour and mood. Not a uniform.
      </figcaption>
    </figure>
  );
}

function DressCodeNote({ note }: { note: string }) {
  const blocks = note
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length <= 1 && !note.includes("\n")) {
    return <p className={styles.lede}>{note}</p>;
  }
  return (
    <div className={styles.dressNote}>
      {blocks.map((block) => {
        const [heading, ...rest] = block.split("\n");
        const body = rest.join(" ").trim();
        return (
          <div className={styles.dressNoteBlock} key={heading}>
            {heading ? (
              <p className={body ? styles.dressNoteHead : styles.lede}>{heading}</p>
            ) : null}
            {body ? <p className={styles.dressNoteBody}>{body}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function AureliaLocationPreview({
  mapsUrl,
  venueName,
  address,
  href,
  label,
  invitationId,
  previewImageUrl,
}: {
  mapsUrl?: string | null;
  venueName?: string;
  address?: string;
  href?: string | null;
  label: string;
  invitationId: string;
  previewImageUrl?: string;
}) {
  const query = [venueName, address].filter(Boolean).join(", ");
  const embedUrl = toMapsEmbedUrl(mapsUrl || href, query || venueName);
  if (!embedUrl && !previewImageUrl) return null;

  const frame = (
    <div className={styles.mapFrame}>
      {previewImageUrl ? (
        <img
          src={previewImageUrl}
          alt=""
          className={styles.mapStatic}
          draggable={false}
        />
      ) : embedUrl ? (
        <iframe
          title={`Map of ${label}`}
          src={embedUrl}
          className={styles.mapIframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
        />
      ) : null}
      <span className={styles.mapVeil} aria-hidden />
      <span className={styles.mapBadge}>
        <MapPin size={13} aria-hidden />
        Preview
      </span>
    </div>
  );

  if (!href) return <div className={styles.mapPreview}>{frame}</div>;

  return (
    <a
      className={styles.mapPreview}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open map of ${label}`}
      onClick={() =>
        trackInviteEvent({
          eventType: "INVITE_ACTION_CLICK",
          invitationId,
          metadata: { action: "maps_preview" },
        })
      }
    >
      {frame}
    </a>
  );
}

export function AureliaEditorialWeddingTemplate(props: InvitationRendererProps) {
  const config = useMemo(
    () =>
      mergeAureliaWedding(
        props.design.experience?.aureliaWedding,
        aureliaFamilyDefaults(props.design.layout)
      ),
    [props.design.experience?.aureliaWedding, props.design.layout]
  );
  const nav = useMemo(() => aureliaNavItems(config), [config]);
  const [monoOne, monoTwo] = useMemo(
    () => splitMonogram(config.monogram, config.partnerOneName, config.partnerTwoName),
    [config.monogram, config.partnerOneName, config.partnerTwoName]
  );
  const monogramLabel = `${monoOne} & ${monoTwo}`;
  const familyMonogram =
    props.design.layout === SERAPHINE_LAYOUT_SLUG ? SERAPHINE_MONOGRAM : config.monogramImageUrl;
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroMode, setHeroMode] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(config.faqs[0]?.id ?? null);
  const isSeraphine = props.design.layout === SERAPHINE_LAYOUT_SLUG;
  const familyHero = isSeraphine ? SERAPHINE_HERO_FALLBACK : AURELIA_HERO_FALLBACK;
  const resolvedHero = useMemo(
    () =>
      resolveAureliaHeroImage({
        heroImageUrl: config.heroImageUrl,
        coverImageUrl: props.event.coverImageUrl,
        mediaHeroUrl: (props.design.media ?? []).find(
          (asset) => asset.type === "image" && asset.role === "hero"
        )?.url,
        heroCleared: props.design.heroCleared,
        fallback: familyHero,
      }),
    [config.heroImageUrl, familyHero, props.design.heroCleared, props.design.media, props.event.coverImageUrl]
  );
  const [heroSrc, setHeroSrc] = useState(resolvedHero);
  const coupleAlbum = useMemo(
    () =>
      resolveAureliaCoupleAlbum({
        galleryUrls: isSeraphine
          ? [...SERAPHINE_LOOKBOOK_GALLERY]
          : [...(props.galleryUrls ?? []), ...AURELIA_COUPLE_GALLERY],
        media: isSeraphine ? [] : props.design.media,
        journey: isSeraphine ? [] : config.journey,
        reservedUrls: [resolvedHero, familyMonogram],
      }),
    [
      config.journey,
      familyMonogram,
      isSeraphine,
      props.design.media,
      props.galleryUrls,
      resolvedHero,
    ]
  );
  const journeyMoments = useMemo(
    () =>
      isSeraphine
        ? resolveAureliaJourneyMoments({
            journey: config.journey,
            galleryUrls: props.galleryUrls,
            media: props.design.media,
            catalogFallback: SERAPHINE_JOURNEY_CHAPTERS,
            reservedUrls: [...SERAPHINE_LOOKBOOK_GALLERY],
          })
        : [],
    [config.journey, isSeraphine, props.design.media, props.galleryUrls]
  );
  const menuId = useId();
  const lookbookId = useId();
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const countdownIso = resolveAureliaCountdownIso(
    config.ceremonies,
    props.event.startDateRaw
  );
  const count = useCountdown(countdownIso);

  useEffect(() => {
    setHeroSrc(resolvedHero);
  }, [resolvedHero]);

  useLayoutEffect(() => {
    document.getElementById("aurelia-journey")?.remove();
  }, []);

  useEffect(() => {
    const hero = document.getElementById("aurelia-home");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroMode(Boolean(entry?.isIntersecting)),
      { threshold: 0.55 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const jump = (id: string) => {
    setMenuOpen(false);
    document.getElementById(`aurelia-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const mapsHref = (mapsUrl?: string, venueName?: string, address?: string) =>
    buildDirectionsUrl({
      mapsLink: mapsUrl,
      venueName,
      landmark: address,
    });
  const mapsDirectionsHref = (mapsUrl?: string, venueName?: string, address?: string) =>
    toGoogleMapsDirectionsHref(
      mapsUrl,
      [venueName, address].filter(Boolean).join(", ")
    );
  const seraphineMapPreview: Record<string, string> = {
    traditional: SERAPHINE_TRADITIONAL_MAP_IMAGE,
    white: SERAPHINE_WHITE_MAP_IMAGE,
  };

  return (
    <div
      className={`${styles.root} ${isSeraphine ? styles.seraphine : ""} ${invitationFontVars}`}
      style={aureliaTokenStyle(config.theme)}
      data-aurelia-template="true"
      data-aurelia-journey="off"
      data-testid="aurelia-editorial-wedding"
    >
      <header className={`${styles.header} ${heroMode ? styles.headerOnHero : ""}`}>
        {isSeraphine ? (
          <button
            type="button"
            className={styles.headerCrestBtn}
            aria-label={monogramLabel}
            onClick={() => {
              setMenuOpen(false);
              document.getElementById("aurelia-home")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span className={`${styles.headerCrest} ${styles.finaleMarkInk}`} aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SERAPHINE_MONOGRAM_CREST} alt="" width={1024} height={1024} />
            </span>
          </button>
        ) : familyMonogram ? (
          <span className={styles.monogramMark} aria-label={monogramLabel}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={familyMonogram} alt="" width={160} height={160} />
          </span>
        ) : (
          <span className={styles.monogram} aria-label={monogramLabel}>
            <span className={styles.monogramLetter}>{monoOne}</span>
            <span className={styles.monogramAmp} aria-hidden>
              &amp;
            </span>
            <span className={styles.monogramLetter}>{monoTwo}</span>
          </span>
        )}
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open invitation menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
        </button>
      </header>

      {menuOpen ? (
        <div className={styles.overlay} id={menuId} role="dialog" aria-modal="true" aria-label="Invitation menu">
          <div className={styles.overlayHead}>
            <div className={styles.overlayBrand}>
              {familyMonogram ? (
                <span
                  className={
                    isSeraphine
                      ? `${styles.overlayCrest} ${styles.finaleMarkInk}`
                      : `${styles.monogramMark} ${styles.overlayMark}`
                  }
                  aria-label={monogramLabel}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={isSeraphine ? SERAPHINE_MONOGRAM_CREST : familyMonogram}
                    alt=""
                    width={isSeraphine ? 1024 : 320}
                    height={isSeraphine ? 1024 : 320}
                  />
                </span>
              ) : (
                <span className={styles.monogram} aria-label={monogramLabel}>
                  <span className={styles.monogramLetter}>{monoOne}</span>
                  <span className={styles.monogramAmp} aria-hidden>
                    &amp;
                  </span>
                  <span className={styles.monogramLetter}>{monoTwo}</span>
                </span>
              )}
            </div>
          </div>
          <nav className={styles.overlayNav}>
            {nav.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={styles.overlayLink}
                onClick={() => jump(item.id)}
              >
                <span className={styles.overlayIndex}>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className={styles.overlayClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <span className={styles.overlayCloseMark} aria-hidden>
              <X size={17} strokeWidth={1.7} />
            </span>
            <span className={styles.overlayCloseLabel}>Close</span>
          </button>
        </div>
      ) : null}

      <section className={styles.hero} id="aurelia-home">
        <img
          className={styles.heroImage}
          src={heroSrc}
          alt=""
          width={731}
          height={1024}
          sizes="100vw"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onError={() => {
            if (heroSrc !== familyHero) setHeroSrc(familyHero);
          }}
        />
        <div
          className={styles.heroGrade}
          style={{
            opacity: isSeraphine
              ? Math.min(0.22, Math.max(0.08, config.heroOverlay ?? 0.16))
              : Math.min(0.55, Math.max(0.12, config.heroOverlay ?? 0.26)),
          }}
        />
        <div className={styles.heroScrim} />
        <span className={styles.heroRing} style={{ width: 140, height: 140, left: "8%", top: "22%" }} />
        <span className={styles.heroRing} style={{ width: 180, height: 180, right: "6%", bottom: "18%" }} />
        <span className={`${styles.eyebrow} ${styles.heroFamily}`}>{config.familyIntro}</span>
        <div className={styles.heroCopy}>
          <div className={styles.heroNames}>
            <span className={styles.heroName}>{config.partnerOneName}</span>
            <span className={styles.ampersand}>&amp;</span>
            <span className={`${styles.heroName} ${styles.heroNameTwo}`}>{config.partnerTwoName}</span>
          </div>
          <p className={styles.heroMeta}>{config.marriedLine}</p>
          {isSeraphine ? (
            <AureliaHeroCalendar
              label={config.dateDisplay}
              ceremonies={config.ceremonies}
              open={calOpen}
              onOpenChange={setCalOpen}
            />
          ) : (
            <p className={styles.heroDate}>{config.dateDisplay}</p>
          )}
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.btnOutline} onClick={() => jump("celebrations")}>
            {config.celebrationCta}
          </button>
          <button type="button" className={styles.btnFill} onClick={() => jump("rsvp")}>
            {config.rsvpCta}
          </button>
        </div>
      </section>

      <section className={styles.countdown} aria-label="Countdown">
        <span className={`${styles.eyebrow} ${styles.countdownDates}`}>
          {isSeraphine ? (
            <>
              <span>13</span>
              <span className={styles.countdownDateRule} aria-hidden>
                |
              </span>
              <span>14 November 2026</span>
            </>
          ) : (
            config.dateDisplay
          )}
        </span>
        <h2 className={styles.heading}>{config.countdownTitle}</h2>
        <div className={styles.goldRule} />
        {isSeraphine ? (
          <div
            className={styles.countStage}
            role="timer"
            aria-live="off"
            aria-label={`${count.d} days ${count.h} hours ${count.m} minutes ${count.s} seconds`}
            data-testid="seraphine-countdown"
          >
            <SeraphineHourglass
              count={count}
              monogram={config.monogram}
              coupleLine={`${config.partnerOneName} & ${config.partnerTwoName}`}
              dateLine={config.dateDisplay}
            />
          </div>
        ) : (
          <div className={styles.grid}>
            {[
              ["DAYS", count.d],
              ["HOURS", count.h],
              ["MINUTES", count.m],
              ["SECONDS", count.s],
            ].map(([label, value]) => (
              <div className={styles.cell} key={String(label)}>
                <div className={styles.cellNum}>{pad(Number(value))}</div>
                <span className={styles.cellLabel}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {aureliaSectionVisible(config, "story") ? (
        <section
          className={`${styles.section} ${styles.storySection}${isSeraphine ? ` ${styles.storySplit}` : ""}`}
          id="aurelia-story"
        >
          {coupleAlbum.length > 0 ? (
            <AureliaCoupleAlbum
              items={coupleAlbum}
              coupleNames={`${config.partnerOneName} & ${config.partnerTwoName}`}
              variant="story"
              look={isSeraphine ? "lookbook" : "flush"}
            />
          ) : config.storyImageUrl ? (
            <img
              className={styles.storyImage}
              src={config.storyImageUrl}
              alt={`${config.partnerOneName} and ${config.partnerTwoName}`}
              width={730}
              height={1024}
              sizes="100vw"
              decoding="async"
            />
          ) : null}
          <div className={`${styles.sectionNarrow} ${styles.storyCopy}`}>
            <span className={styles.eyebrow}>{config.storyEyebrow}</span>
            <h2 className={styles.heading}>{config.storyTitle}</h2>
            <div className={styles.goldRule} />
            <div className={styles.bodyCopy}>
              {config.storyParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
            <span className={styles.signature}>{config.storySignature}</span>
          </div>
        </section>
      ) : null}
      {isSeraphine && journeyMoments.length > 0 ? (
        <AureliaJourneyMoments
          items={journeyMoments}
          coupleNames={`${config.partnerOneName} & ${config.partnerTwoName}`}
        />
      ) : null}

      {aureliaSectionVisible(config, "celebrations") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-celebrations">
          <span className={styles.eyebrow}>{config.celebrationsEyebrow}</span>
          <h2 className={styles.heading}>{config.celebrationsTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.celebrationsLede}</p>
          <div className={styles.cardDeck}>
          {config.ceremonies.map((ceremony) => {
            const href = mapsHref(ceremony.mapsUrl, ceremony.venueName, ceremony.address);
            const directionsHref = mapsDirectionsHref(
              ceremony.mapsUrl,
              ceremony.venueName,
              ceremony.address
            );
            const hasMaps = Boolean(
              href && (ceremony.mapsUrl?.trim() || ceremony.address?.trim())
            );
            const hasTime = Boolean(ceremony.timeLabel?.trim());
            const hasVenue = Boolean(ceremony.venueName?.trim() || ceremony.address?.trim());
            const timePending = /to be announced|tba|\btbd\b/i.test(ceremony.timeLabel ?? "");
            const calendarVenue = calendarEventLocation(ceremony.venueName, ceremony.address);
            return (
              <article className={styles.card} key={ceremony.id}>
                <div className={styles.cardKicker}>{ceremony.kicker}</div>
                <h3 className={styles.cardTitle}>{ceremony.title}</h3>
                <div className={styles.goldRule} />
                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <Calendar size={22} strokeWidth={1.9} aria-hidden />
                    <p>
                      <span className={styles.metaPrimary}>{ceremony.weekday}</span>
                      <span className={styles.metaPrimary}>{ceremony.dateLabel}</span>
                    </p>
                  </div>
                  {hasTime ? (
                    <div className={styles.metaRow}>
                      <Clock size={22} strokeWidth={1.9} aria-hidden />
                      <p>
                        <span className={styles.metaPrimary}>{ceremony.timeLabel}</span>
                      </p>
                    </div>
                  ) : null}
                  {hasVenue ? (
                    <div className={styles.metaRow}>
                      <MapPin size={22} strokeWidth={1.9} aria-hidden />
                      <p>
                        {ceremony.venueName ? (
                          <span className={styles.metaPrimary}>{ceremony.venueName}</span>
                        ) : null}
                        {ceremony.address ? (
                          <span className={styles.metaSecondary}>{ceremony.address}</span>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                </div>
                {hasMaps ? (
                  <AureliaLocationPreview
                    mapsUrl={ceremony.mapsUrl}
                    venueName={ceremony.venueName}
                    address={ceremony.address}
                    href={directionsHref || href}
                    label={ceremony.venueName}
                    invitationId={props.invitation.id}
                    previewImageUrl={isSeraphine ? seraphineMapPreview[ceremony.id] : undefined}
                  />
                ) : null}
                {hasMaps && (directionsHref || href) ? (
                  <a
                    className={styles.directions}
                    href={directionsHref || href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackInviteEvent({
                        eventType: "INVITE_ACTION_CLICK",
                        invitationId: props.invitation.id,
                        metadata: { action: "maps" },
                      })
                    }
                  >
                    Get directions
                  </a>
                ) : null}
                {ceremony.startAtIso ? (
                  <SetReminderButton
                    className={styles.reminder}
                    variant="plain"
                    showHint={false}
                    event={{
                      title: `${config.partnerOneName} & ${config.partnerTwoName} · ${ceremony.title}`,
                      startDateRaw: ceremony.startAtIso,
                      venue: calendarVenue,
                      timeZone: EVENT_TIME_ZONE,
                      allDay: timePending,
                      description: [
                        timePending
                          ? "Time details to be announced."
                          : [ceremony.weekday, ceremony.dateLabel, ceremony.timeLabel]
                              .filter(Boolean)
                              .join(" · "),
                        calendarVenue,
                        directionsHref || href ? `Directions: ${directionsHref || href}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n"),
                    }}
                  />
                ) : null}
              </article>
            );
          })}
          </div>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "venues") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-venues">
          <span className={styles.eyebrow}>{config.venuesEyebrow}</span>
          <h2 className={styles.heading}>{config.venuesTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.venuesLede}</p>
          <div className={styles.cardDeck}>
          {aureliaDistinctVenues(config).map((venue) => {
            const href = mapsHref(venue.mapsUrl, venue.venueName, venue.address);
            const directionsHref = mapsDirectionsHref(
              venue.mapsUrl,
              venue.venueName,
              venue.address
            );
            return (
              <article className={styles.card} key={venue.id}>
                <div className={styles.cardKicker}>{venue.eventLabel}</div>
                <h3 className={styles.cardTitle}>{venue.venueName}</h3>
                <p className={styles.lede}>
                  {venue.addressPrivate ? config.privateAddressCopy : venue.address}
                </p>
                {!venue.addressPrivate ? (
                  <AureliaLocationPreview
                    mapsUrl={venue.mapsUrl}
                    venueName={venue.venueName}
                    address={venue.address}
                    href={directionsHref || href}
                    label={venue.venueName}
                    invitationId={props.invitation.id}
                  />
                ) : null}
                {directionsHref || href ? (
                  <a
                    className={styles.directions}
                    href={directionsHref || href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackInviteEvent({
                        eventType: "INVITE_ACTION_CLICK",
                        invitationId: props.invitation.id,
                        metadata: { action: "maps" },
                      })
                    }
                  >
                    Open in Google Maps
                  </a>
                ) : null}
              </article>
            );
          })}
          </div>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "dress") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-dress">
          <span className={styles.eyebrow}>{config.dressEyebrow}</span>
          <h2 className={styles.heading}>{config.dressTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.dressLede}</p>
          <div className={styles.cardDeck}>
          {config.dressCodes.map((dress) => {
            const outfitLookbook = isSeraphine && dress.id === "outfits" && Boolean(dress.imageUrl);
            return (
            <article
              key={dress.id}
              className={`${dress.variant === "dark" ? styles.dressDark : styles.dressLight}${
                outfitLookbook ? ` ${styles.outfitBoard}` : ""
              }`}
            >
              <div className={styles.cardKicker}>{dress.dateLabel}</div>
              <h3 className={styles.cardTitle}>{dress.title}</h3>
              {dress.scriptLine ? <p className={styles.scriptLine}>{dress.scriptLine}</p> : null}
              {dress.note ? <DressCodeNote note={dress.note} /> : null}
              {outfitLookbook ? (
                <div className={styles.outfitLookbook}>
                  <button
                    type="button"
                    className={styles.outfitToggle}
                    aria-expanded={lookbookOpen}
                    aria-controls={lookbookId}
                    onClick={() => setLookbookOpen((open) => !open)}
                  >
                    <span>{lookbookOpen ? "Hide the lookbook" : "View the lookbook"}</span>
                    <ChevronDown
                      size={18}
                      className={lookbookOpen ? styles.outfitChevronOpen : styles.outfitChevron}
                      aria-hidden
                    />
                  </button>
                  {lookbookOpen ? (
                    <OutfitLookbookDeck
                      id={lookbookId}
                      slides={SERAPHINE_GUEST_OUTFIT_SLIDES.map((slide) => ({
                        id: slide.id,
                        label: slide.label,
                        src: slide.imageUrl,
                        alt: slide.alt,
                      }))}
                    />
                  ) : null}
                </div>
              ) : dress.imageUrl ? (
                <img
                  className={styles.dressImage}
                  src={dress.imageUrl}
                  alt=""
                  width={720}
                  height={900}
                  decoding="async"
                />
              ) : null}
              {dress.palette.length ? (
                <div className={styles.swatches}>
                  {dress.palette.map((swatch) => (
                    <div className={styles.swatch} key={`${dress.id}-${swatch.hex}`}>
                      <span className={styles.swatchDot} style={{ background: swatch.hex }} />
                      <span className={styles.swatchName}>{swatch.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
            );
          })}
          </div>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "album") ? (
        <section
          className={`${styles.section} ${styles.sectionNarrow}`}
          id="aurelia-album"
          data-testid="aurelia-album"
        >
          <span className={styles.eyebrow}>{config.albumEyebrow}</span>
          <h2 className={styles.heading}>{config.albumTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.albumLede}</p>
          <AureliaMemoryAlbum
            eventTitle={props.event.title}
            invitationId={props.invitation.id}
            uploadUrl={props.memoryUploadUrl}
            albumUrl={props.memoryAlbumUrl}
            uploadQrImageUrl={props.memoryUploadQrImageUrl}
            qrCenterImageUrl={
              isOrganizerUploadedQrCenter(props.event.qrCenterImageUrl)
                ? props.event.qrCenterImageUrl!.trim()
                : isOrganizerUploadedQrCenter(resolvedHero)
                  ? resolvedHero
                  : isSeraphine
                    ? SERAPHINE_HERO_FALLBACK
                    : AURELIA_QR_CENTER
            }
            uploadCta={config.albumUploadCta}
            viewCta={config.albumViewCta}
          />
        </section>
      ) : null}

      {aureliaSectionVisible(config, "gifts") ? (
        <section
          className={`${styles.section} ${styles.sectionNarrow}`}
          id="aurelia-gifts"
          data-testid="aurelia-gifts"
        >
          <span className={styles.eyebrow}>{config.giftsEyebrow}</span>
          <h2 className={styles.heading}>{config.giftsTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.giftsLede}</p>
          <ClientErrorBoundary fallback={null}>
            <AureliaGiftCheckout
              giftUrl={props.giftUrl}
              giftQrImageUrl={props.giftQrImageUrl}
              giftTitle={props.giftTitle}
              giftSubtitle={props.giftSubtitle}
              giftCtaLabel={props.giftCtaLabel}
              giftPrivacyNote={props.giftPrivacyNote}
              guestName={props.guestName}
              guestQrToken={props.guestQrToken}
              eventId={props.eventId}
              inviteLink={props.invitation.uniqueLink}
              returnPath={
                props.invitation.uniqueLink
                  ? `/invite/${props.invitation.uniqueLink}#aurelia-gifts`
                  : null
              }
              detailsNote={config.giftsDetails}
              collapsible
            />
          </ClientErrorBoundary>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "rsvp") ? (
        <section className={styles.rsvpBand} id="aurelia-rsvp" data-rsvp-root="true">
          <div className={styles.sectionNarrow}>
            <h2 className={styles.heading}>{config.rsvpTitle}</h2>
            <div className={styles.goldRule} />
            <div className={styles.rsvpPanel}>
              <InvitationRsvpPanel
                invitationId={props.invitation.id}
                guestId={props.guestId}
                guestName={props.guestName}
                partyAllowance={props.partyAllowance}
                initialRsvpStatus={props.initialRsvpStatus}
                initialAttendingCount={props.initialAttendingCount}
                variant="dark"
                accentColor={config.theme.terracotta}
                showEmail={false}
                choiceLabels={{
                  accepted: "Joyfully accept",
                  declined: "Regretfully decline",
                  maybe: "Maybe",
                }}
              />
            </div>
            {(config.rsvpContacts ?? []).length > 0 ? (
              <div className={styles.rsvpContacts}>
                <p className={styles.rsvpContactsEyebrow}>
                  {config.rsvpContactsEyebrow || "Call or WhatsApp"}
                </p>
                <ul className={styles.rsvpContactList}>
                  {(config.rsvpContacts ?? []).map((contact) => {
                    const message = `Hello ${contact.name}, I would like to RSVP for ${config.partnerOneName} and ${config.partnerTwoName}.`;
                    const links = aureliaGuestPhoneLinks(contact.phone, message);
                    if (!links) return null;
                    return (
                      <li key={`${contact.name}-${contact.phone}`} className={styles.rsvpContact}>
                        <div className={styles.rsvpContactCopy}>
                          <span className={styles.rsvpContactName}>{contact.name}</span>
                          {config.rsvpShowPhone ? (
                            <span className={styles.rsvpContactLine}>{contact.phone}</span>
                          ) : null}
                        </div>
                        <div className={styles.rsvpContactActions}>
                          <a
                            className={styles.rsvpCall}
                            href={links.telHref}
                            aria-label={`Call ${contact.name}`}
                          >
                            <Phone aria-hidden size={14} strokeWidth={1.75} />
                            Call
                          </a>
                          <a
                            className={styles.rsvpWhatsApp}
                            href={links.whatsAppHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${contact.name}`}
                          >
                            <WhatsAppIcon title="" className={styles.rsvpWhatsAppLogo} />
                            WhatsApp
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "faq") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-faq">
          <span className={styles.eyebrow}>{config.faqEyebrow}</span>
          <h2 className={styles.heading}>{config.faqTitle}</h2>
          <div className={styles.goldRule} />
          {config.faqs.map((faq) => {
            const open = openFaq === faq.id;
            return (
              <div key={faq.id}>
                <button
                  type="button"
                  className={styles.accordion}
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : faq.id)}
                >
                  {faq.question}
                  <span aria-hidden="true">{open ? "×" : "+"}</span>
                </button>
                {open ? <p className={styles.faqAnswer}>{faq.answer}</p> : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <footer className={styles.finale}>
        {familyMonogram ? (
          <p
            className={`${styles.finaleMark} ${isSeraphine ? styles.finaleMarkInk : ""}`}
            aria-label={monogramLabel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isSeraphine ? SERAPHINE_MONOGRAM_CREST : familyMonogram}
              alt=""
              width={1024}
              height={1024}
            />
          </p>
        ) : (
          <p className={styles.monogram} aria-label={monogramLabel}>
            <span className={styles.monogramLetter}>{monoOne}</span>
            <span className={styles.monogramAmp} aria-hidden>
              &amp;
            </span>
            <span className={styles.monogramLetter}>{monoTwo}</span>
          </p>
        )}
        <p className={styles.signature}>{config.finaleScript}</p>
        <p className={styles.finaleLine}>{config.finaleLine}</p>
      </footer>
    </div>
  );
}
