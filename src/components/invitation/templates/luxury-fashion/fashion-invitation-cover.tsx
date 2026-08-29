"use client";

import type { LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";
import { resolveFashionLede } from "@/lib/experience/luxury-fashion";
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
  const lede = resolveFashionLede(house);

  return (
    <div className={`${styles.masthead} ${className ?? ""}`}>
      <FashionHouseMark house={house} className={styles.campaignMark} priority />
      <Heading className={styles.campaignHouse}>{house.houseName}</Heading>
      {house.eventTitle.trim() ? <p className={styles.campaignEvent}>{house.eventTitle}</p> : null}
      {showLede && lede ? <p className={styles.campaignLede}>{lede}</p> : null}

      <ul className={styles.campaignFacts}>
        <li>
          <FashionFactMark kind="location" />
          <div>
            <p>Location</p>
            {place ? <strong>{place}</strong> : null}
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
