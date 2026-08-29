"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from "react";
import {
  resolveFashionLede,
  type FashionChapterFlags,
  type FashionNavDestination,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";
import { FashionHouseMark } from "./femmora-mark";
import { FashionFactMark } from "./fashion-fact-marks";
import { FashionFilmScene, type FashionFilmHandle } from "./fashion-film-scene";
import { FashionLaunchCountdown } from "./fashion-launch-countdown";
import { FashionMapsPreview } from "./fashion-maps-preview";
import { FashionLocationActions } from "./luxury-location-scene";
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
  filmPlayNonce = 0,
  storePreviewOpen = false,
  filmRevealed,
  filmRef,
  calendar,
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
  filmPlayNonce?: number;
  storePreviewOpen?: boolean;
  filmRevealed?: boolean;
  filmRef?: Ref<FashionFilmHandle>;
  calendar?: ReactNode;
}) {
  const filmOpen = filmRevealed ?? storePreviewOpen;
  const lede = resolveFashionLede(house);
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

      <div className={styles.campaignGrid} data-film-open={filmOpen ? "true" : "false"}>
        <div className={styles.masthead}>
          <FashionHouseMark house={house} className={styles.campaignMark} priority />
          <h1 className={styles.campaignHouse}>{house.houseName}</h1>
          {house.eventTitle.trim() ? <p className={styles.campaignEvent}>{house.eventTitle}</p> : null}
          {lede ? <p className={styles.campaignLede}>{lede}</p> : null}

          <ul className={styles.campaignFacts}>
            <li id="fashion-location">
              <FashionFactMark kind="location" />
              <div>
                <p>Location</p>
                {place ? <strong>{place}</strong> : null}
                {chapters.mapsCta ? (
                  <FashionMapsPreview
                    compact
                    mapsUrl={house.mapsUrl}
                    locationName={house.locationName}
                    address={house.address}
                    onOpen={onMaps}
                  />
                ) : null}
                <FashionLocationActions
                  locationName={house.locationName}
                  address={house.address}
                  mapsUrl={house.mapsUrl}
                  copyLabel={house.copyLocationLabel}
                  shareLabel={house.shareLocationLabel}
                />
              </div>
            </li>
            {house.hoursLabel.trim() ? (
              <li>
                <FashionFactMark kind="time" />
                <div>
                  <p>Time</p>
                  <strong>{house.hoursLabel}</strong>
                </div>
              </li>
            ) : null}
            {house.datesLabel.trim() ? (
              <li>
                <FashionFactMark kind="date" />
                <div>
                  <p>Date</p>
                  <strong>
                    <FashionOrdinalLine text={house.datesLabel} />
                  </strong>
                </div>
              </li>
            ) : null}
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

          {calendar ? <div className={styles.campaignCalendar}>{calendar}</div> : null}
        </div>

        {chapters["store-preview"] ? (
          <div
            className={`${styles.campaignFilm} ${filmOpen ? styles.campaignFilmOpen : ""}`}
            id={storePreviewId}
            data-testid="fashion-store-preview"
            data-open={filmOpen ? "true" : "false"}
            aria-hidden={!filmOpen}
            inert={!filmOpen ? true : undefined}
          >
            <div className={styles.campaignFilmInner}>
              <p className={styles.kicker}>{house.filmChapterTitle || "Store preview"}</p>
              <FashionFilmScene
                ref={filmRef}
                src={filmSrc}
                poster={filmPoster}
                skipLabel={house.filmSkipLabel}
                variant="campaign"
                playNonce={filmPlayNonce}
                active={filmOpen}
                onStarted={onFilmStarted}
                onCompleted={onFilmCompleted}
                onMuteToggle={onFilmMute}
                onFullscreen={onFilmFullscreen}
                onContinue={() => onNavigate(chapters.collection ? "collection" : "rsvp")}
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
