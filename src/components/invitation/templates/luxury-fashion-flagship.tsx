"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import {
  fashionTokenStyle,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  trackFashionAction,
  type FashionNavDestination,
} from "@/lib/experience/luxury-fashion";
import { FEMMORA_CATALOG_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { FashionEditorialIndex } from "./luxury-fashion/fashion-editorial-index";
import { FashionFilmScene } from "./luxury-fashion/fashion-film-scene";
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
  const [current, setCurrent] = useState<FashionNavDestination>("experience");
  const invitationId = props.invitation.id;

  const go = useCallback(
    (id: FashionNavDestination) => {
      setCurrent(id);
      trackFashionAction("nav_clicked", {
        invitationId,
        templateSlug: FEMMORA_CATALOG_SLUG,
        extra: { dest: id },
      });
      document.getElementById(SECTION_IDS[id])?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [invitationId]
  );

  return (
    <article className={styles.root} style={fashionTokenStyle() as CSSProperties} data-testid="luxury-fashion-flagship">
      <header className={styles.hero} id={SECTION_IDS.experience} data-testid="fashion-details">
        <div className={styles.monogram} aria-hidden>
          {house.monogram}
        </div>
        <h1 className={styles.house}>{house.houseName}</h1>
        <p className={styles.event}>{house.eventTitle}</p>
        <div className={styles.rule} />
        <p className={styles.lede} style={{ maxWidth: "22rem", marginInline: "auto" }}>
          {house.teaserLine}
        </p>
      </header>

      <FashionEditorialIndex labels={house.navLabels} current={current} onSelect={go} />

      <section className={styles.section} id={SECTION_IDS["event-details"]}>
        <p className={styles.kicker}>The opening</p>
        <h2 className={styles.heading}>{house.houseName}</h2>
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
        <div style={{ marginTop: "1.5rem" }}>
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
                description: house.teaserLine,
              }}
              accentColor="#9A7A48"
              variant="minimal"
            />
          </span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS["store-preview"]}>
        <p className={styles.kicker}>Atelier film</p>
        <h2 className={styles.heading}>Store preview</h2>
        <FashionFilmScene
          src={film.src}
          poster={film.poster}
          cta={house.filmCta}
          skipLabel={house.filmSkipLabel}
          onStarted={() =>
            trackFashionAction("store_preview_started", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
          onCompleted={() =>
            trackFashionAction("store_preview_completed", {
              invitationId,
              templateSlug: FEMMORA_CATALOG_SLUG,
            })
          }
          onContinue={() => go("collection")}
        />
      </section>

      <section className={`${styles.section} ${styles.sectionWide}`} id={SECTION_IDS.collection}>
        <p className={styles.kicker}>Collection</p>
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

      <FashionFinale message={house.finaleMessage} houseName={house.houseName} />
    </article>
  );
}
