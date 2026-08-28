"use client";

import type { LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";
import { FashionHouseMark } from "./femmora-mark";
import { FashionFactMark } from "./fashion-fact-marks";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionOrdinalLine({ text }: { text: string }) {
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

export function FashionInvitationCover({
  house,
  mapsEnabled,
  onMaps,
  mapsInteractive = true,
  headingAs = "h1",
  showLede = false,
  className,
}: {
  house: LuxuryFashionHouseConfig;
  mapsEnabled: boolean;
  onMaps?: () => void;
  mapsInteractive?: boolean;
  headingAs?: "h1" | "p";
  showLede?: boolean;
  className?: string;
}) {
  const place = [house.locationName, house.address].filter(Boolean).join(", ");
  const Heading = headingAs;
  const mapsLabel = house.mapsCtaLabel || "View on Google Maps";

  return (
    <div className={`${styles.masthead} ${className ?? ""}`}>
      <FashionHouseMark house={house} className={styles.campaignMark} />
      <Heading className={styles.campaignHouse}>{house.houseName}</Heading>
      <p className={styles.campaignEvent}>{house.eventTitle}</p>
      {showLede ? <p className={styles.campaignLede}>{house.hubLede}</p> : null}

      <ul className={styles.campaignFacts}>
        <li>
          <FashionFactMark kind="location" />
          <div>
            <p>Location</p>
            <strong>{place}</strong>
            {mapsEnabled && house.mapsUrl ? (
              mapsInteractive ? (
                <a className={styles.mapsCta} href={house.mapsUrl} target="_blank" rel="noreferrer" onClick={onMaps}>
                  {mapsLabel}
                </a>
              ) : (
                <span>{mapsLabel}</span>
              )
            ) : null}
          </div>
        </li>
        <li>
          <FashionFactMark kind="time" />
          <div>
            <p>Time</p>
            <strong>{house.hoursLabel}</strong>
          </div>
        </li>
        <li>
          <FashionFactMark kind="date" />
          <div>
            <p>Date</p>
            <strong>
              <FashionOrdinalLine text={house.datesLabel} />
            </strong>
          </div>
        </li>
      </ul>
    </div>
  );
}
