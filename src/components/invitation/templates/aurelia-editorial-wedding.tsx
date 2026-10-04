"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Clock, MapPin, Menu, Phone, X } from "lucide-react";
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
  SERAPHINE_COUPLE_GALLERY,
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
} from "@/lib/experience/aurelia-editorial";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { EVENT_TIME_ZONE } from "@/lib/constants";
import { invitationFontVars } from "@/lib/invitation-fonts";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { AureliaCoupleAlbum } from "./aurelia-couple-album";
import { AureliaGiftCheckout } from "./aurelia-gift-checkout";
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
          ? [...SERAPHINE_COUPLE_GALLERY]
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
  const menuId = useId();
  const lookbookId = useId();
  const [lookbookOpen, setLookbookOpen] = useState(false);
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
        {familyMonogram ? (
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
          <button type="button" className={styles.overlayClose} onClick={() => setMenuOpen(false)}>
            Close
          </button>
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
          <button type="button" className={styles.menuButton} aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={22} />
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
          <p className={styles.heroDate}>{config.dateDisplay}</p>
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

      {aureliaSectionVisible(config, "celebrations") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-celebrations">
          <span className={styles.eyebrow}>{config.celebrationsEyebrow}</span>
          <h2 className={styles.heading}>{config.celebrationsTitle}</h2>
          <div className={styles.goldRule} />
          <p className={styles.lede}>{config.celebrationsLede}</p>
          <div className={styles.cardDeck}>
          {config.ceremonies.map((ceremony) => {
            const href = mapsHref(ceremony.mapsUrl, ceremony.venueName, ceremony.address);
            const hasMaps = Boolean(
              href && (ceremony.mapsUrl?.trim() || ceremony.address?.trim())
            );
            const hasTime = Boolean(ceremony.timeLabel?.trim());
            const hasVenue = Boolean(ceremony.venueName?.trim() || ceremony.address?.trim());
            const timePending = /to be announced|tba|\btbd\b/i.test(ceremony.timeLabel ?? "");
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
                    href={href}
                    label={ceremony.venueName}
                    invitationId={props.invitation.id}
                    previewImageUrl={isSeraphine ? seraphineMapPreview[ceremony.id] : undefined}
                  />
                ) : null}
                {hasMaps && href ? (
                  <a
                    className={styles.directions}
                    href={href}
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
                      venue: ceremony.venueName,
                      timeZone: EVENT_TIME_ZONE,
                      allDay: timePending,
                      description: timePending ? "Time details to be announced." : undefined,
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
                    href={href}
                    label={venue.venueName}
                    invitationId={props.invitation.id}
                  />
                ) : null}
                {href ? (
                  <a
                    className={styles.directions}
                    href={href}
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
              {dress.note ? <p className={styles.lede}>{dress.note}</p> : null}
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
                    <figure id={lookbookId} className={styles.outfitPanel}>
                      <div className={styles.outfitMat}>
                        <img
                          className={styles.outfitImage}
                          src={dress.imageUrl ?? ""}
                          alt="Lookbook of bright guest dresses and complementary suits"
                          width={864}
                          height={1152}
                          decoding="async"
                        />
                      </div>
                      <div className={styles.outfitLegend}>
                        <span>Ladies</span>
                        <span>Gentlemen</span>
                      </div>
                      <figcaption className={styles.outfitCaption}>
                        A lookbook for colour and mood. Not a uniform.
                      </figcaption>
                    </figure>
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
