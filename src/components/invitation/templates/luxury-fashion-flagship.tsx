"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import {
  fashionTokenStyle,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  resolveFashionStoreStills,
  trackFashionAction,
  type FashionNavDestination,
} from "@/lib/experience/luxury-fashion";
import { FEMMORA_CATALOG_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { FemmoraMark } from "./luxury-fashion/femmora-mark";
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
  const [current, setCurrent] = useState<FashionNavDestination>("experience");
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const invitationId = props.invitation.id;

  const scrollTo = useCallback((id: FashionNavDestination) => {
    document.getElementById(SECTION_IDS[id])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const go = useCallback(
    (id: FashionNavDestination) => {
      setCurrent(id);
      trackFashionAction("nav_clicked", {
        invitationId,
        templateSlug: FEMMORA_CATALOG_SLUG,
        extra: { dest: id },
      });
      if (id === "experience") {
        trackFashionAction("boutique_opened", { invitationId, templateSlug: FEMMORA_CATALOG_SLUG });
        setBoutiqueOpen(true);
        return;
      }
      scrollTo(id);
    },
    [invitationId, scrollTo]
  );

  return (
    <article
      className={styles.root}
      style={
        {
          ...fashionTokenStyle(),
          ...(house.silkBedUrl ? { ["--ff-silk-bed" as string]: `url("${house.silkBedUrl}")` } : null),
        } as CSSProperties
      }
      data-testid="luxury-fashion-flagship"
    >
      <header className={styles.hero} id={SECTION_IDS.experience} data-testid="fashion-details">
        <div className={styles.silkBed} aria-hidden />
        <div className={styles.card}>
          <FemmoraMark className={styles.mark} />
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
                  {house.locationName}, {house.address}
                </strong>
                <a
                  href={house.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackFashionAction("maps_clicked", {
                      invitationId,
                      templateSlug: FEMMORA_CATALOG_SLUG,
                    })
                  }
                >
                  on Google Maps
                </a>
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

      <FashionEditorialIndex labels={house.navLabels} current={current} onSelect={go} />
      <p className={styles.swipeHint}>{house.swipeHint}</p>

      <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS["store-preview"]}>
        <p className={styles.kicker}>A first look</p>
        <h2 className={styles.heading}>Store preview</h2>
        <FashionFilmScene
          src={film.src}
          poster={film.poster}
          cta={house.filmCta}
          skipLabel={house.filmSkipLabel}
          onStarted={() =>
            trackFashionAction("film_started", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
          onCompleted={() =>
            trackFashionAction("film_completed", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
          onContinue={() => go("collection")}
        />
        <div className={styles.storeBrowseWrap}>
          <p className={styles.kicker}>Atelier stills</p>
          <FashionStoreBrowse
            items={stills}
            onOpen={() =>
              trackFashionAction("store_preview_started", {
                invitationId,
                templateSlug: FEMMORA_CATALOG_SLUG,
              })
            }
          />
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS.collection}>
        <p className={styles.kicker}>The collection</p>
        <h2 className={styles.heading}>{house.lookbookTitle}</h2>
        <EditorialLookbook
          title={house.lookbookTitle}
          items={looks}
          onOpen={() =>
            trackFashionAction("collection_opened", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
        />
      </section>

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
            <dd>
              {house.locationName}, {house.address}
            </dd>
          </div>
        </dl>
        <div className={styles.countdownWrap}>
          <FashionLaunchCountdown
            startAtIso={house.startAtIso}
            beforeLabel={house.countdownBeforeLabel}
            afterLabel={house.countdownAfterLabel}
          />
        </div>
        <div className={styles.ctaRow}>
          <span
            data-testid="fashion-calendar"
            onClick={() =>
              trackFashionAction("calendar_clicked", {
                invitationId,
                templateSlug: FEMMORA_CATALOG_SLUG,
              })
            }
          >
            <SetReminderButton
              event={{
                title: `${house.houseName} ${house.eventTitle}`,
                startDateRaw: house.startAtIso,
                endDateRaw: house.endAtIso,
                venue: `${house.locationName}, ${house.address}`,
                description: house.hubLede,
              }}
              accentColor="#9A7A48"
              variant="minimal"
            />
          </span>
        </div>
      </section>

      <section className={styles.section} id={SECTION_IDS.location}>
        <LuxuryLocationScene
          locationName={house.locationName}
          address={house.address}
          mapsUrl={house.mapsUrl}
          onMaps={() =>
            trackFashionAction("maps_clicked", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
        />
      </section>

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
          onStarted={() =>
            trackFashionAction("rsvp_started", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
          onCompleted={() =>
            trackFashionAction("rsvp_completed", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
        />
      </section>

      <section className={styles.section} id={SECTION_IDS.share}>
        <FashionShareScene
          event={props.event}
          uniqueLink={props.invitation.uniqueLink}
          onShare={() =>
            trackFashionAction("share_clicked", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
        />
      </section>

      <FashionFinale
        message={house.finaleMessage}
        kicker={house.finaleKicker}
        houseName={house.houseName}
        datesLabel={house.datesLabel}
        address={house.address}
      />

      <FashionBoutiqueExperience
        houseName={house.houseName}
        open={boutiqueOpen}
        onClose={() => setBoutiqueOpen(false)}
        onSelect={(id) => {
          setCurrent(id);
          scrollTo(id);
        }}
      />
    </article>
  );
}
