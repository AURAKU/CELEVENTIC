"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import {
  fashionTokenStyleFromColors,
  LUXURY_FASHION_LAYOUT_SLUG,
  resolveFashionChapters,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  resolveFashionSocialLinks,
  resolveFashionSocialTitle,
  resolveFashionStoreStills,
  trackFashionAction,
  type FashionNavDestination,
} from "@/lib/experience/luxury-fashion";
import { trackSocialLinkClick } from "@/lib/invitation/social-link-analytics";
import { requestInvitationReplay } from "@/lib/experience/replay-invitation";
import { forceUnlockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { FashionCampaignHero } from "./luxury-fashion/fashion-campaign-hero";
import { FashionEditorialIndex } from "./luxury-fashion/fashion-editorial-index";
import { FashionBoutiqueExperience } from "./luxury-fashion/fashion-boutique-experience";
import { FashionFlyerExperience } from "./luxury-fashion/fashion-flyer-experience";
import { FashionStoreBrowse } from "./luxury-fashion/fashion-store-browse";
import { EditorialLookbook } from "./luxury-fashion/editorial-lookbook";
import { LuxuryLocationScene } from "./luxury-fashion/luxury-location-scene";
import { FashionRsvpScene } from "./luxury-fashion/fashion-rsvp-scene";
import { FashionShareScene } from "./luxury-fashion/fashion-share-scene";
import { FashionSocialScene } from "./luxury-fashion/fashion-social-scene";
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
  social: "fashion-social",
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
  const socialLinks = useMemo(() => resolveFashionSocialLinks(house), [house]);
  const socialTitle = useMemo(() => resolveFashionSocialTitle(house), [house]);
  const navLabels = useMemo(
    () =>
      house.navLabels
        .filter((item) => chapters[item.id])
        .map((item) => (item.id === "social" ? { ...item, label: socialTitle } : item)),
    [chapters, house.navLabels, socialTitle]
  );
  const [current, setCurrent] = useState<FashionNavDestination>("experience");
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const [filmPlayNonce, setFilmPlayNonce] = useState(0);
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
      if (id === "store-preview") {
        trackFashionAction("store_preview_started", { invitationId, templateSlug });
        window.setTimeout(() => setFilmPlayNonce((n) => n + 1), 120);
      }
    },
    [chapters, invitationId, scrollTo, templateSlug]
  );

  return (
    <article
      className={styles.root}
      style={
        {
          ...fashionTokenStyleFromColors(props.design.colors),
        } as CSSProperties
      }
      data-testid="luxury-fashion-flagship"
      data-fashion-house={house.houseName}
    >
      <FashionCampaignHero
        house={house}
        chapters={chapters}
        filmSrc={film.src}
        filmPoster={film.poster}
        onNavigate={go}
        onMaps={() => trackFashionAction("maps_clicked", { invitationId, templateSlug })}
        onFilmStarted={() => {
          trackFashionAction("film_started", { invitationId, templateSlug });
          trackFashionAction("store_film_play", { invitationId, templateSlug });
        }}
        onFilmCompleted={() => {
          trackFashionAction("film_completed", { invitationId, templateSlug });
          trackFashionAction("store_film_complete", { invitationId, templateSlug });
        }}
        onFilmMute={() => trackFashionAction("film_muted", { invitationId, templateSlug })}
        onFilmFullscreen={() => trackFashionAction("film_fullscreen", { invitationId, templateSlug })}
        storePreviewId={SECTION_IDS["store-preview"]}
        filmPlayNonce={filmPlayNonce}
      />

      <FashionEditorialIndex labels={navLabels} current={current} onSelect={go} />
      <p className={styles.swipeHint}>{house.swipeHint}</p>

      {stills.length ? (
        <section className={`${styles.section} ${styles.sectionWide}`}>
          <p className={styles.kicker}>A first look</p>
          <h2 className={styles.heading}>Atelier stills</h2>
          <div className={styles.storeBrowseWrap}>
            <FashionStoreBrowse
              items={stills}
              onOpen={() =>
                trackFashionAction("store_preview_started", { invitationId, templateSlug })
              }
            />
          </div>
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
            mapsCtaLabel={house.mapsCtaLabel}
            copyLabel={house.copyLocationLabel}
            shareLabel={house.shareLocationLabel}
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

      {chapters.social ? (
        <section className={`${styles.section} ${styles.socialSection}`} id={SECTION_IDS.social}>
          <FashionSocialScene
            title={socialTitle}
            intro={house.socialIntroText}
            houseName={house.houseName}
            links={socialLinks}
            onOpen={(platform) =>
              trackSocialLinkClick({
                invitationId,
                templateSlug,
                platform,
                location: "social-page",
              })
            }
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
        replayLabel={house.replayUnveilingLabel}
        onReplayUnveiling={() => {
          trackFashionAction("replay_unveiling", { invitationId, templateSlug });
          requestInvitationReplay();
        }}
        onCollection={chapters.collection ? () => go("collection") : undefined}
        socialLinks={house.showSocialIconsInFinale ? socialLinks : []}
        onSocial={(platform) =>
          trackSocialLinkClick({
            invitationId,
            templateSlug,
            platform,
            location: "finale",
          })
        }
      />

      {chapters.experience ? (
        house.experienceFlyerUrl?.trim() ? (
          <FashionFlyerExperience
            houseName={house.houseName}
            flyerUrl={house.experienceFlyerUrl}
            open={boutiqueOpen}
            onClose={() => {
              forceUnlockRevealScroll();
              setBoutiqueOpen(false);
            }}
          />
        ) : (
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
        )
      ) : null}
    </article>
  );
}
