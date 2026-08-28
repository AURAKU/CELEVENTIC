"use client";

import { FashionHouseMark } from "@/components/invitation/templates/luxury-fashion/femmora-mark";
import type { LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";
import styles from "./luxury-fashion-opening.module.css";

export function FashionFolioScene({
  house,
  teaserSrc,
  teaserPoster,
  open,
  armed,
  reduceMotion,
  onOpen,
}: {
  house: LuxuryFashionHouseConfig;
  teaserSrc: string | null;
  teaserPoster: string | null;
  open: boolean;
  armed: boolean;
  reduceMotion: boolean;
  onOpen: () => void;
}) {
  const label = `Open the ${house.houseName} folio`;

  return (
    <div
      className={`${styles.folioLayer} ${open ? styles.folioLayerOpen : ""}`}
      data-testid="fashion-folio"
      aria-hidden={open}
    >
      <div className={styles.folio}>
        <span className={styles.folioGrain} aria-hidden />
        {!reduceMotion ? <span className={styles.folioFoil} aria-hidden /> : null}
        <span className={styles.folioSeam} aria-hidden />
        {!reduceMotion ? <span className={styles.folioLeak} aria-hidden /> : null}

        {teaserSrc || teaserPoster ? (
          <div className={styles.folioWindow} aria-hidden data-testid="fashion-folio-teaser">
            {teaserSrc && !reduceMotion ? (
              <video
                className={styles.folioWindowMedia}
                src={teaserSrc}
                poster={teaserPoster ?? undefined}
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
              />
            ) : teaserPoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.folioWindowMedia} src={teaserPoster} alt="" />
            ) : null}
          </div>
        ) : null}

        <div className={styles.folioFace}>
          <FashionHouseMark house={house} className={styles.folioClaspMark} />
          <p className={styles.folioHouse}>{house.houseName}</p>
          <p className={styles.folioEvent}>{house.eventTitle}</p>
          <p className={styles.folioLine}>{house.folioFaceLine || "A PRIVATE FIRST LOOK"}</p>
        </div>

        <button
          type="button"
          className={styles.folioClasp}
          data-testid="fashion-folio-clasp"
          aria-label={label}
          disabled={!armed || open}
          onClick={onOpen}
        >
          <FashionHouseMark house={house} className={styles.folioClaspMark} />
        </button>
        <p className={styles.folioHint} aria-hidden>
          {armed ? "Open folio" : "Preparing"}
        </p>
      </div>
    </div>
  );
}
