"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import {
  fashionTokenStyleFromColors,
  resolveFashionChapters,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  resolveFashionStoreStills,
  trackFashionAction,
  type FashionNavDestination,
} from "@/lib/experience/luxury-fashion";
import { LUXURY_FASHION_LAYOUT_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { FashionHouseMark } from "./luxury-fashion/femmora-mark";
import { FashionEditorialIndex } from "./luxury-fashion/fashion-editorial-index";
import { FashionBoutiqueExperience } from "./luxury-fashion/fashion-boutique-experience";
import { FashionFilmScene } from "./luxury-fashion/fashion-film-scene";
import { FashionStoreBrowse } from "./luxury-fashion/fashion-store-browse";
import { EditorialLookbook } from "./luxury-fashion/editorial-lookbook";
import { FashionLaunchCountdown } from "./luxury-fashion/fashion-launch-countdown";
import { LuxuryLocationScene } from "./luxury-fashion/luxury-location-scene";
import { FashionRsvpScene } from "./luxury-fashion/fashion-rsvp-scene";
import { FashionShareScene } from "./luxury-fashion/fashion-share-scene";
import { FashionFinale } from "./luxury-fashion/fashion-finale";
import styles from "./luxury-fashion/luxury-fashion-flagship.module.css";

const SECTION_IDS: Record<FashionNavDestination, string> = {
  experience: "fashion-experience",
  "store-preview": "fashion-store-preview",
  collection: "fashion-collection",
  "event-details": "fashion-event-details",
  location: "fashion-location",
  rsvp: "fashion-rsvp",
  share: "fashion-share",
};

function FashionOrdinalLine({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:ST|ND|RD|TH))/i);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^(\d+)(ST|ND|RD|TH)$/i);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <span key={`${part}-${index}`}>
            {match[1]}
            <sup className={styles.ord}>{match[2]}</sup>
          </span>
        );
      })}
    </>
  );
}

export function LuxuryFashionFlagshipTemplate(props: InvitationRenderProps & { galleryUrls?: string[] }) {
  const house = useMemo(
    () => resolveFashionHouse(props.design, props.event),
    [props.design, props.event]
  );
  const film = useMemo(
    () => resolveFashionFilm({ house, media: props.design.media }),
    [house, props.design.media]
  );
  const looks = useMemo(
    () =>
      resolveFashionLookbook({
        house,
        galleryUrls: props.galleryUrls,
        media: props.design.media,
      }),
    [house, props.galleryUrls, props.design.media]
  );
  const stills = useMemo(
    () =>
      resolveFashionStoreStills({
        house,
        galleryUrls: props.galleryUrls,
        media: props.design.media,
      }),
    [house, props.galleryUrls, props.design.media]
  );
  const chapters = useMemo(
    () =>
      resolveFashionChapters({
        house,
        filmSrc: film.src,
        looksCount: looks.length,
        enabledTabs: props.design.experience?.enabledTabs,
      }),
    [film.src, house, looks.length, props.design.experience?.enabledTabs]
  );
  const navLabels = useMemo(
    () => house.navLabels.filter((item) => chapters[item.id]),
    [chapters, house.navLabels]
  );
  const [current, setCurrent] = useState<FashionNavDestination>("experience");
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const invitationId = props.invitation.id;
  const templateSlug = LUXURY_FASHION_LAYOUT_SLUG;

  const scrollTo = useCallback((id: FashionNavDestination) => {
    document.getElementById(SECTION_IDS[id])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const go = useCallback(
    (id: FashionNavDestination) => {
      if (!chapters[id]) return;
      setCurrent(id);
      trackFashionAction("nav_clicked", {
        invitationId,
        templateSlug,
        extra: { dest: id },
      });
      if (id === "experience") {
        trackFashionAction("boutique_opened", { invitationId, templateSlug });
        setBoutiqueOpen(true);
        return;
      }
      scrollTo(id);
    },
    [chapters, invitationId, scrollTo, templateSlug]
  );

  return (
    <article
      className={styles.root}
      style={
        {
          ...fashionTokenStyleFromColors(props.design.colors),
          ...(house.silkBedUrl ? { ["--ff-silk-bed" as string]: `url("${house.silkBedUrl}")` } : null),
        } as CSSProperties
      }
      data-testid="luxury-fashion-flagship"
      data-fashion-house={house.houseName}
    >
      <header className={styles.hero} id={SECTION_IDS.experience} data-testid="fashion-details">
        <div className={styles.silkBed} aria-hidden />
        <div className={styles.card}>
          <FashionHouseMark house={house} className={styles.mark} />
          <h1 className={styles.house}>{house.houseName}</h1>
          <span className={styles.ornament} aria-hidden />
          <p className={styles.event}>{house.eventTitle}</p>
          <span className={styles.ornament} aria-hidden />
          <ul className={styles.cardFacts}>
            <li>
              <MapPin size={16} strokeWidth={1.25} aria-hidden />
              <div>
                <p>Location</p>
                <strong>
                  {[house.locationName, house.address].filter(Boolean).join(", ")}
                </strong>
                {chapters.mapsCta ? (
                  <a
                    href={house.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      trackFashionAction("maps_clicked", { invitationId, templateSlug })
                    }
                  >
                    on Google Maps
                  </a>
                ) : null}
              </div>
            </li>
            <li>
              <Clock size={16} strokeWidth={1.25} aria-hidden />
              <div>
                <p>Time</p>
                <strong>{house.hoursLabel}</strong>
              </div>
            </li>
            <li>
              <CalendarDays size={16} strokeWidth={1.25} aria-hidden />
              <div>
                <p>Date</p>
                <strong>
                  <FashionOrdinalLine text={house.datesLabel} />
                </strong>
              </div>
            </li>
          </ul>
        </div>
      </header>

      <FashionEditorialIndex labels={navLabels} current={current} onSelect={go} />
      <p className={styles.swipeHint}>{house.swipeHint}</p>

      {chapters["store-preview"] ? (
        <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS["store-preview"]}>
          <p className={styles.kicker}>A first look</p>
          <h2 className={styles.heading}>Store preview</h2>
          <FashionFilmScene
            src={film.src}
            poster={film.poster}
            cta={house.filmCta}
            skipLabel={house.filmSkipLabel}
            onStarted={() => trackFashionAction("film_started", { invitationId, templateSlug })}
            onCompleted={() => trackFashionAction("film_completed", { invitationId, templateSlug })}
            onMuteToggle={() => trackFashionAction("film_muted", { invitationId, templateSlug })}
            onFullscreen={() => trackFashionAction("film_fullscreen", { invitationId, templateSlug })}
            onContinue={() => go(chapters.collection ? "collection" : "event-details")}
          />
          {stills.length ? (
            <div className={styles.storeBrowseWrap}>
              <p className={styles.kicker}>Atelier stills</p>
              <FashionStoreBrowse
                items={stills}
                onOpen={() =>
                  trackFashionAction("store_preview_started", { invitationId, templateSlug })
                }
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {chapters.collection ? (
        <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS.collection}>
          <p className={styles.kicker}>The collection</p>
          <h2 className={styles.heading}>{house.lookbookTitle}</h2>
          <EditorialLookbook
            title={house.lookbookTitle}
            items={looks}
            onOpen={() => trackFashionAction("collection_opened", { invitationId, templateSlug })}
          />
        </section>
      ) : null}

      <section className={styles.section} id={SECTION_IDS["event-details"]}>
        <p className={styles.kicker}>Event details</p>
        <h2 className={styles.heading}>{house.eventTitle}</h2>
        <p className={styles.lede}>{house.hubLede}</p>
        <dl className={styles.meta}>
          <div>
            <dt>Date</dt>
            <dd>{house.datesLabel}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{house.hoursLabel}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{[house.locationName, house.address].filter(Boolean).join(", ")}</dd>
          </div>
        </dl>
        {chapters.countdown ? (
          <div className={styles.countdownWrap}>
            <FashionLaunchCountdown
              startAtIso={house.startAtIso}
              beforeLabel={house.countdownBeforeLabel}
              afterLabel={house.countdownAfterLabel}
            />
          </div>
        ) : null}
        {house.startAtIso ? (
          <div className={styles.ctaRow}>
            <span
              data-testid="fashion-calendar"
              onClick={() => trackFashionAction("calendar_clicked", { invitationId, templateSlug })}
            >
              <SetReminderButton
                event={{
                  title: `${house.houseName} ${house.eventTitle}`,
                  startDateRaw: house.startAtIso,
                  endDateRaw: house.endAtIso,
                  venue: [house.locationName, house.address].filter(Boolean).join(", "),
                  description: house.hubLede,
                }}
                accentColor={props.design.colors.accent}
                variant="minimal"
              />
            </span>
          </div>
        ) : null}
      </section>

      {chapters.location ? (
        <section className={styles.section} id={SECTION_IDS.location}>
          <LuxuryLocationScene
            locationName={house.locationName}
            address={house.address}
            mapsUrl={chapters.mapsCta ? house.mapsUrl : ""}
            onMaps={() => trackFashionAction("maps_clicked", { invitationId, templateSlug })}
          />
        </section>
      ) : null}

      {chapters.rsvp ? (
        <section className={styles.section} id={SECTION_IDS.rsvp}>
          <FashionRsvpScene
            invitationId={props.invitation.id}
            guestId={props.guestId}
            guestName={props.guestName}
            partyAllowance={props.partyAllowance}
            initialRsvpStatus={props.initialRsvpStatus}
            initialAttendingCount={props.initialAttendingCount}
            heading={house.rsvpHeading}
            acceptedLabel={house.rsvpAcceptedLabel}
            visitDayOptions={house.visitDayOptions}
            onStarted={() => trackFashionAction("rsvp_started", { invitationId, templateSlug })}
            onCompleted={() => trackFashionAction("rsvp_completed", { invitationId, templateSlug })}
          />
        </section>
      ) : null}

      {chapters.share ? (
        <section className={styles.section} id={SECTION_IDS.share}>
          <FashionShareScene
            event={props.event}
            uniqueLink={props.invitation.uniqueLink}
            onShare={() => trackFashionAction("share_clicked", { invitationId, templateSlug })}
          />
        </section>
      ) : null}

      <FashionFinale
        message={house.finaleMessage}
        kicker={house.finaleKicker}
        houseName={house.houseName}
        datesLabel={house.datesLabel}
        address={house.address}
        onRsvp={chapters.rsvp ? () => go("rsvp") : undefined}
        onLocation={chapters.location ? () => go("location") : undefined}
        onShare={chapters.share ? () => go("share") : undefined}
        onReplayFilm={chapters["store-preview"] ? () => go("store-preview") : undefined}
        onCollection={chapters.collection ? () => go("collection") : undefined}
      />

      {chapters.experience ? (
        <FashionBoutiqueExperience
          houseName={house.houseName}
          open={boutiqueOpen}
          available={navLabels.map((item) => item.id)}
          onClose={() => setBoutiqueOpen(false)}
          onSelect={(id) => {
            setCurrent(id);
            scrollTo(id);
          }}
        />
      ) : null}
    </article>
  );
}
