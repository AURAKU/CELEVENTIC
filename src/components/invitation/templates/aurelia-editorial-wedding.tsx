"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Menu, X } from "lucide-react";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { useCountdown } from "@/hooks/use-countdown";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import {
  AURELIA_HERO_FALLBACK,
  AURELIA_WHITE_ISO,
  aureliaDistinctVenues,
  aureliaFamilyDefaults,
  aureliaNavItems,
  aureliaSectionVisible,
  aureliaTokenStyle,
  mergeAureliaWedding,
  resolveAureliaHeroImage,
} from "@/lib/experience/aurelia-editorial";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { EVENT_TIME_ZONE } from "@/lib/constants";
import { invitationFontVars } from "@/lib/invitation-fonts";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { AureliaGiftCheckout } from "./aurelia-gift-checkout";
import { AureliaMemoryAlbum } from "./aurelia-memory-album";
import styles from "./aurelia-editorial-wedding.module.css";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function splitMonogram(value: string): [string, string] {
  const parts = value
    .split(/\s*&\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const one = (parts[0] || "E").slice(0, 2);
  const two = (parts[1] || one).slice(0, 2);
  return [one, two];
}

function AureliaLocationPreview({
  mapsUrl,
  venueName,
  address,
  href,
  label,
  invitationId,
}: {
  mapsUrl?: string | null;
  venueName?: string;
  address?: string;
  href?: string | null;
  label: string;
  invitationId: string;
}) {
  const query = [venueName, address].filter(Boolean).join(", ");
  const embedUrl = toMapsEmbedUrl(mapsUrl || href, query || venueName);
  if (!embedUrl) return null;

  const frame = (
    <div className={styles.mapFrame}>
      <iframe
        title={`Map of ${label}`}
        src={embedUrl}
        className={styles.mapIframe}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
      />
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
  const [monoOne, monoTwo] = useMemo(() => splitMonogram(config.monogram), [config.monogram]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroMode, setHeroMode] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(config.faqs[0]?.id ?? null);
  const resolvedHero = useMemo(
    () =>
      resolveAureliaHeroImage({
        heroImageUrl: config.heroImageUrl,
        coverImageUrl: props.event.coverImageUrl,
        mediaHeroUrl: (props.design.media ?? []).find(
          (asset) => asset.type === "image" && asset.role === "hero"
        )?.url,
        heroCleared: props.design.heroCleared,
      }),
    [config.heroImageUrl, props.design.heroCleared, props.design.media, props.event.coverImageUrl]
  );
  const [heroSrc, setHeroSrc] = useState(resolvedHero);
  const menuId = useId();
  const countdownIso =
    config.ceremonies.find((c) => c.startAtIso)?.startAtIso ||
    props.event.startDateRaw ||
    AURELIA_WHITE_ISO;
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

  return (
    <div
      className={`${styles.root} ${invitationFontVars}`}
      style={aureliaTokenStyle(config.theme)}
      data-aurelia-template="true"
      data-aurelia-journey="off"
      data-testid="aurelia-editorial-wedding"
    >
      <header className={`${styles.header} ${heroMode ? styles.headerOnHero : ""}`}>
        <span className={styles.monogram} aria-label={config.monogram}>
          <span className={styles.monogramLetter}>{monoOne}</span>
          <span className={styles.monogramAmp} aria-hidden>
            &amp;
          </span>
          <span className={styles.monogramLetter}>{monoTwo}</span>
        </span>
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
            if (heroSrc !== AURELIA_HERO_FALLBACK) setHeroSrc(AURELIA_HERO_FALLBACK);
          }}
        />
        <div
          className={styles.heroGrade}
          style={{ opacity: Math.min(0.55, Math.max(0.12, config.heroOverlay ?? 0.26)) }}
        />
        <div className={styles.heroScrim} />
        <span className={styles.heroRing} style={{ width: 140, height: 140, left: "8%", top: "22%" }} />
        <span className={styles.heroRing} style={{ width: 180, height: 180, right: "6%", bottom: "18%" }} />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{config.familyIntro}</span>
          <div className={styles.heroNames}>
            <span className={styles.heroName}>{config.partnerOneName}</span>
            <span className={styles.ampersand}>&amp;</span>
            <span className={`${styles.heroName} ${styles.heroNameTwo}`}>{config.partnerTwoName}</span>
          </div>
          <p className={styles.heroMeta}>{config.marriedLine}</p>
          <p className={styles.heroDate}>{config.dateDisplay}</p>
          <p className={styles.heroTagline}>{config.heroTagline}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.btnOutline} onClick={() => jump("celebrations")}>
              {config.celebrationCta}
            </button>
            <button type="button" className={styles.btnFill} onClick={() => jump("rsvp")}>
              {config.rsvpCta}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.countdown} aria-label="Countdown">
        <span className={styles.eyebrow}>{config.dateDisplay.replace(/\s+/g, "  ")}</span>
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
        <section className={`${styles.section} ${styles.storySection}`} id="aurelia-story">
          {config.storyImageUrl ? (
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
            return (
              <article className={styles.card} key={ceremony.id}>
                <div className={styles.cardKicker}>{ceremony.kicker}</div>
                <h3 className={styles.cardTitle}>{ceremony.title}</h3>
                <div className={styles.goldRule} />
                <div className={styles.metaRow}>
                  <Calendar size={16} />
                  <span>
                    {ceremony.weekday}
                    <br />
                    {ceremony.dateLabel}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <Clock size={16} />
                  <span>{ceremony.timeLabel}</span>
                </div>
                <div className={styles.metaRow}>
                  <MapPin size={16} />
                  <span>
                    {ceremony.venueName}
                    {ceremony.address ? `, ${ceremony.address}` : ""}
                  </span>
                </div>
                {!ceremony.addressPrivate ? (
                  <AureliaLocationPreview
                    mapsUrl={ceremony.mapsUrl}
                    venueName={ceremony.venueName}
                    address={ceremony.address}
                    href={href}
                    label={ceremony.venueName}
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
          {config.dressCodes.map((dress) => (
            <article
              key={dress.id}
              className={dress.variant === "dark" ? styles.dressDark : styles.dressLight}
            >
              <div className={styles.cardKicker}>{dress.dateLabel}</div>
              <h3 className={styles.cardTitle}>{dress.title}</h3>
              {dress.scriptLine ? <p className={styles.scriptLine}>{dress.scriptLine}</p> : null}
              {dress.note ? <p className={styles.lede}>{dress.note}</p> : null}
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
          ))}
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
            uploadCta={config.albumUploadCta}
            viewCta={config.albumViewCta}
          />
        </section>
      ) : null}

      {aureliaSectionVisible(config, "rsvp") ? (
        <section className={styles.rsvpBand} id="aurelia-rsvp" data-rsvp-root="true">
          <div className={styles.sectionNarrow}>
            {config.rsvpByLabel ? <span className={styles.eyebrow}>{config.rsvpByLabel}</span> : null}
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
          </div>
        </section>
      ) : null}

      {aureliaSectionVisible(config, "gifts") ? (
        <section className={`${styles.section} ${styles.sectionNarrow}`} id="aurelia-gifts">
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
            />
          </ClientErrorBoundary>
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
        <p className={styles.monogram} aria-label={config.monogram}>
          <span className={styles.monogramLetter}>{monoOne}</span>
          <span className={styles.monogramAmp} aria-hidden>
            &amp;
          </span>
          <span className={styles.monogramLetter}>{monoTwo}</span>
        </p>
        <p className={styles.signature}>{config.finaleScript}</p>
        <p className={styles.finaleLine}>{config.finaleLine}</p>
      </footer>
    </div>
  );
}
