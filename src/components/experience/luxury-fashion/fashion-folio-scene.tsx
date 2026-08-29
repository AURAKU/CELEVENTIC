"use client";

import { FashionHouseMark } from "@/components/invitation/templates/luxury-fashion/femmora-mark";
import { FashionInvitationCover } from "@/components/invitation/templates/luxury-fashion/fashion-invitation-cover";
import { resolveFashionFlyerCard, type LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";
import styles from "./luxury-fashion-opening.module.css";

export function FashionEnvelopeScene({
  house,
  phase,
  armed,
  reduceMotion,
  onOpenCard,
}: {
  house: LuxuryFashionHouseConfig;
  phase: "envelope" | "envelope-opening" | "card-presented" | "card-morphing";
  armed: boolean;
  reduceMotion: boolean;
  onOpenCard: () => void;
}) {
  const flyer = resolveFashionFlyerCard(house);
  const faceLine = house.envelopeFaceLine || house.folioFaceLine || "";
  const cta = house.cardCtaLabel?.trim() || "OPEN";
  const unsealing = phase !== "envelope";
  const presented = phase === "card-presented" || phase === "card-morphing";
  const morphing = phase === "card-morphing";
  const label = `Open the ${house.houseName} invitation`;

  return (
    <div
      className={`${styles.envelopeLayer} ${unsealing ? styles.envelopeUnsealing : ""} ${
        presented ? styles.envelopePresented : ""
      } ${morphing ? styles.envelopeLayerMorph : ""} ${reduceMotion ? styles.envelopeReduced : ""}`}
      data-testid="fashion-envelope"
      data-envelope-phase={phase}
    >
      <div className={styles.envelopeStage}>
        <div className={`${styles.envelope} ${unsealing ? styles.envelopeOpened : ""}`}>
          <span className={styles.envelopeLining} aria-hidden />
          <span className={styles.envelopeShadow} aria-hidden />
          <div className={styles.envelopeFace} aria-hidden={unsealing}>
            <FashionHouseMark house={house} className={styles.envelopeMark} />
            <p className={styles.envelopeHouse}>{house.houseName}</p>
            {faceLine ? <p className={styles.envelopeLine}>{faceLine}</p> : null}
          </div>
          <span className={`${styles.envelopeFlap} ${unsealing ? styles.envelopeFlapOpen : ""}`} aria-hidden />
          <div className={styles.envelopePocket}>
            <button
              type="button"
              className={`${styles.invitationCard} ${presented ? styles.invitationCardReady : ""}`}
              data-testid="fashion-invitation-card"
              aria-label={label}
              aria-hidden={presented}
              tabIndex={presented ? -1 : 0}
              disabled={!armed || !presented || morphing}
              onClick={onOpenCard}
            >
              <span className={styles.cardFoil} aria-hidden />
              {flyer ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.flyerArt} src={flyer} alt="" />
              ) : (
                <FashionInvitationCover
                  house={house}
                  mapsEnabled={Boolean(house.mapsUrl)}
                  mapsInteractive={false}
                  headingAs="p"
                  className={styles.liveCover}
                />
              )}
              {presented ? <span className={styles.cardCta}>{cta}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Envelope scene is the current opening. */
export const FashionFolioScene = FashionEnvelopeScene;
