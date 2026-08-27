"use client";

import { useState } from "react";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { copyText } from "@/lib/clipboard";
import styles from "./luxury-fashion-flagship.module.css";

export function LuxuryLocationScene({
  locationName,
  address,
  mapsUrl,
  onMaps,
}: {
  locationName: string;
  address: string;
  mapsUrl: string;
  onMaps?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const href = buildDirectionsUrl({ mapsLink: mapsUrl, venueName: locationName, landmark: address });
  const label = [locationName, address].filter(Boolean).join(", ");

  async function copyAddress() {
    const ok = await copyText(label);
    setCopied(ok);
  }

  async function shareLocation() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: locationName, text: label, url: href ?? undefined });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyAddress();
  }

  return (
    <div data-testid="fashion-location">
      <p className={styles.kicker}>Location</p>
      <h2 className={styles.heading}>{locationName}</h2>
      <p className={styles.lede}>{address}</p>
      <div className={styles.ctaRow}>
        {href ? (
          <a
            className={`${styles.cta} ${styles.ctaSolid}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={onMaps}
            data-testid="fashion-maps-cta"
          >
            Google Maps
          </a>
        ) : (
          <button type="button" className={styles.cta} disabled>
            Maps unavailable
          </button>
        )}
        <button type="button" className={styles.cta} onClick={() => void copyAddress()}>
          {copied ? "Address copied" : "Copy address"}
        </button>
        <button type="button" className={styles.cta} onClick={() => void shareLocation()}>
          Share location
        </button>
      </div>
    </div>
  );
}
