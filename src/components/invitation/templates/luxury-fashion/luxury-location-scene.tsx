"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import styles from "./luxury-fashion-flagship.module.css";

export function LuxuryLocationScene({
  locationName,
  address,
  mapsUrl,
  mapsCtaLabel = "View on Google Maps",
  copyLabel = "Copy location",
  shareLabel = "Share location",
  onMaps,
}: {
  locationName: string;
  address: string;
  mapsUrl: string;
  mapsCtaLabel?: string;
  copyLabel?: string;
  shareLabel?: string;
  onMaps?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const href = mapsUrl.trim() || null;
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
            {mapsCtaLabel}
          </a>
        ) : null}
        <button
          type="button"
          className={styles.cta}
          onClick={() => void copyAddress()}
          data-testid="fashion-copy-location"
        >
          {copied ? "Location copied" : copyLabel}
        </button>
        <button
          type="button"
          className={styles.cta}
          onClick={() => void shareLocation()}
          data-testid="fashion-share-location"
        >
          {shareLabel}
        </button>
      </div>
    </div>
  );
}
