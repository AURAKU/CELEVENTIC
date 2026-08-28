"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { FashionChapterFlags, FashionNavDestination, LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";
import { FashionHouseMark } from "./femmora-mark";
import { FashionFilmScene } from "./fashion-film-scene";
import { FashionLaunchCountdown } from "./fashion-launch-countdown";
import styles from "./luxury-fashion-flagship.module.css";

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

export function FashionCampaignHero({
  house,
  chapters,
  filmSrc,
  filmPoster,
  onNavigate,
  onMaps,
  onFilmStarted,
  onFilmCompleted,
  onFilmMute,
  onFilmFullscreen,
  storePreviewId,
}: {
  house: LuxuryFashionHouseConfig;
  chapters: FashionChapterFlags;
  filmSrc: string | null;
  filmPoster: string | null;
  onNavigate: (id: FashionNavDestination) => void;
  onMaps?: () => void;
  onFilmStarted?: () => void;
  onFilmCompleted?: () => void;
  onFilmMute?: () => void;
  onFilmFullscreen?: () => void;
  storePreviewId: string;
}) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const onMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPointer({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }, []);

  const place = [house.locationName, house.address].filter(Boolean).join(", ");

  return (
    <header
      className={styles.campaign}
      id="fashion-experience"
      data-testid="fashion-details"
      onPointerMove={onMove}
      onPointerDown={onMove}
      style={
        {
          ["--pointer-x" as string]: String(pointer.x),
          ["--pointer-y" as string]: String(pointer.y),
        } as CSSProperties
      }
    >
      <div className={styles.campaignEnv} aria-hidden>
        <div className={styles.silkBed} />
        <span className={styles.campaignFold} />
        <span className={styles.campaignFoldAlt} />
        <span className={styles.campaignGlow} />
        <span className={styles.campaignFoil} />
      </div>

      <div className={styles.campaignGrid}>
        <div className={styles.masthead}>
          <FashionHouseMark house={house} className={styles.campaignMark} />
          <h1 className={styles.campaignHouse}>{house.houseName}</h1>
          <p className={styles.campaignEvent}>{house.eventTitle}</p>
          <p className={styles.campaignLede}>{house.hubLede}</p>

          <ul className={styles.campaignFacts}>
            <li>
              <MapPin size={16} strokeWidth={1.25} aria-hidden />
              <div>
                <p>Location</p>
                <strong>{place}</strong>
                {chapters.mapsCta ? (
                  <a href={house.mapsUrl} target="_blank" rel="noreferrer" onClick={onMaps}>
                    {house.mapsCtaLabel || "View on Google Maps"}
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

          {chapters.countdown ? (
            <div className={styles.campaignCountdown}>
              <FashionLaunchCountdown
                startAtIso={house.startAtIso}
                endAtIso={house.endAtIso}
                beforeLabel={house.countdownBeforeLabel}
                afterLabel={house.countdownAfterLabel}
                endedLabel={house.countdownEndedLabel}
              />
            </div>
          ) : null}

          <div className={styles.campaignCtas}>
            {chapters.experience ? (
              <button type="button" className={`${styles.cta} ${styles.ctaSolid}`} onClick={() => onNavigate("experience")}>
                {house.navLabels.find((item) => item.id === "experience")?.label ?? "Enter Experience"}
              </button>
            ) : null}
            {chapters["store-preview"] ? (
              <button type="button" className={styles.cta} onClick={() => onNavigate("store-preview")}>
                {house.navLabels.find((item) => item.id === "store-preview")?.label ?? "Store Preview"}
              </button>
            ) : null}
            {chapters.collection ? (
              <button type="button" className={styles.cta} onClick={() => onNavigate("collection")}>
                {house.navLabels.find((item) => item.id === "collection")?.label ?? "View Collection"}
              </button>
            ) : null}
            {chapters.rsvp ? (
              <button type="button" className={styles.cta} onClick={() => onNavigate("rsvp")}>
                RSVP
              </button>
            ) : null}
          </div>
        </div>

        {chapters["store-preview"] ? (
          <div className={styles.campaignFilm} id={storePreviewId}>
            <p className={styles.kicker}>Store preview</p>
            <h2 className={styles.campaignFilmTitle}>
              {house.filmChapterTitle || `Experience ${house.houseName}`}
            </h2>
            <FashionFilmScene
              src={filmSrc}
              poster={filmPoster}
              cta={house.filmCta}
              skipLabel={house.filmSkipLabel}
              variant="campaign"
              onStarted={onFilmStarted}
              onCompleted={onFilmCompleted}
              onMuteToggle={onFilmMute}
              onFullscreen={onFilmFullscreen}
              onContinue={() => onNavigate(chapters.collection ? "collection" : "event-details")}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
