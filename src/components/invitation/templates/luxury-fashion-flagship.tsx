"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import {
  fashionTokenStyleFromColors,
  LUXURY_FASHION_LAYOUT_SLUG,
  resolveFashionChapters,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLede,
  resolveFashionLookbook,
  resolveFashionSocialLinks,
  resolveFashionSocialTitle,
  trackFashionAction,
  type FashionNavDestination,
} from "@/lib/experience/luxury-fashion";
import { trackSocialLinkClick } from "@/lib/invitation/social-link-analytics";
import { requestInvitationReplay } from "@/lib/experience/replay-invitation";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { FashionCampaignHero } from "./luxury-fashion/fashion-campaign-hero";
import type { FashionFilmHandle } from "./luxury-fashion/fashion-film-scene";
import { FashionEditorialIndex } from "./luxury-fashion/fashion-editorial-index";
import { FashionBoutiqueExperience } from "./luxury-fashion/fashion-boutique-experience";
import { EditorialLookbook } from "./luxury-fashion/editorial-lookbook";
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
  const [storePreviewOpen, setStorePreviewOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [filmPlayNonce, setFilmPlayNonce] = useState(0);
  const filmRef = useRef<FashionFilmHandle>(null);
  const invitationId = props.invitation.id;
  const templateSlug = LUXURY_FASHION_LAYOUT_SLUG;

  const scrollTo = useCallback((id: FashionNavDestination) => {
    document.getElementById(SECTION_IDS[id])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const dismissStorePreview = useCallback(() => {
    setStorePreviewOpen(false);
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
      if (id === "store-preview") {
        setStorePreviewOpen(true);
        setCollectionOpen(false);
        setFilmPlayNonce((n) => n + 1);
        trackFashionAction("store_preview_started", { invitationId, templateSlug });
        void filmRef.current?.play({ allowMutedFallback: true });
        requestAnimationFrame(() => scrollTo(id));
        return;
      }
      setStorePreviewOpen(false);
      if (id === "collection") {
        setCollectionOpen(true);
        requestAnimationFrame(() => scrollTo(id));
        return;
      }
      setCollectionOpen(false);
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
        onMaps={() => {
          dismissStorePreview();
          trackFashionAction("maps_clicked", { invitationId, templateSlug });
        }}
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
        storePreviewOpen={storePreviewOpen}
        filmRef={filmRef}
        calendar={
          house.startAtIso ? (
            <span
              data-testid="fashion-calendar"
              onClick={() => {
                dismissStorePreview();
                trackFashionAction("calendar_clicked", { invitationId, templateSlug });
              }}
            >
              <SetReminderButton
                event={{
                  title: `${house.houseName} ${house.eventTitle}`.trim(),
                  startDateRaw: house.startAtIso,
                  endDateRaw: house.endAtIso,
                  venue: [house.locationName, house.address].filter(Boolean).join(", "),
                  description: resolveFashionLede(house) || `${house.houseName} ${house.eventTitle}`.trim(),
                }}
                accentColor={props.design.colors.accent}
                variant="minimal"
              />
            </span>
          ) : null
        }
      />

      <FashionEditorialIndex labels={navLabels} current={current} onSelect={go} />
      <p className={styles.swipeHint}>{house.swipeHint}</p>

      {chapters.collection ? (
        <section
          className={`${styles.section} ${styles.sectionWide} ${styles.collectionDrop} ${
            collectionOpen ? styles.collectionDropOpen : ""
          }`}
          id={SECTION_IDS.collection}
          data-testid="fashion-collection"
          data-open={collectionOpen ? "true" : "false"}
          aria-hidden={!collectionOpen}
          inert={!collectionOpen ? true : undefined}
        >
          <div className={styles.collectionDropInner}>
            <p className={styles.kicker}>{house.lookbookKicker || "First looks"}</p>
            <h2 className={styles.heading}>{house.lookbookTitle}</h2>
            <EditorialLookbook
              title={house.lookbookTitle}
              items={looks}
              active={collectionOpen}
              onOpen={() => {
                dismissStorePreview();
                trackFashionAction("collection_opened", { invitationId, templateSlug });
              }}
            />
          </div>
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
            onStarted={() => {
              dismissStorePreview();
              trackFashionAction("rsvp_started", { invitationId, templateSlug });
            }}
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
            onOpen={(platform) => {
              dismissStorePreview();
              trackSocialLinkClick({
                invitationId,
                templateSlug,
                platform,
                location: "social-page",
              });
            }}
          />
        </section>
      ) : null}

      {chapters.share ? (
        <section className={styles.section} id={SECTION_IDS.share}>
          <FashionShareScene
            event={props.event}
            uniqueLink={props.invitation.uniqueLink}
            onShare={() => {
              dismissStorePreview();
              trackFashionAction("share_clicked", { invitationId, templateSlug });
            }}
          />
        </section>
      ) : null}

      <FashionFinale
        message={house.finaleMessage}
        kicker={house.finaleKicker}
        houseName={house.houseName}
        datesLabel={house.datesLabel}
        address={house.address}
        replayLabel={house.replayUnveilingLabel}
        onReplayUnveiling={() => {
          trackFashionAction("replay_unveiling", { invitationId, templateSlug });
          requestInvitationReplay();
        }}
        socialLinks={chapters.social ? [] : house.showSocialIconsInFinale ? socialLinks : []}
        onSocial={(platform) => {
          dismissStorePreview();
          trackSocialLinkClick({
            invitationId,
            templateSlug,
            platform,
            location: "finale",
          });
        }}
      />

      {chapters.experience ? (
        <FashionBoutiqueExperience
          houseName={house.houseName}
          open={boutiqueOpen}
          available={navLabels.map((item) => item.id)}
          onClose={() => setBoutiqueOpen(false)}
          onSelect={go}
        />
      ) : null}
    </article>
  );
}
