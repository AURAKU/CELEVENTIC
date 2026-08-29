"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { buildDirectionsUrl, normalizeExternalHref } from "@/lib/invitation/maps-utils";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionMapsPreview({
  mapsUrl,
  locationName,
  address,
  compact = false,
  onOpen,
}: {
  mapsUrl: string;
  locationName: string;
  address: string;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const label = [locationName, address].filter(Boolean).join(", ");
  const href =
    normalizeExternalHref(mapsUrl) ||
    buildDirectionsUrl({ venueName: locationName, landmark: address }) ||
    "";
  const embedUrl = toMapsEmbedUrl(href, label);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const onMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPointer({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }, []);

  if (!href) return null;

  return (
    <div
      className={`${styles.mapsPreview} ${compact ? styles.mapsPreviewCompact : ""}`}
      onPointerMove={onMove}
      style={
        {
          ["--pointer-x" as string]: String(pointer.x),
          ["--pointer-y" as string]: String(pointer.y),
        } as CSSProperties
      }
    >
      <div className={styles.mapsPreviewFrame}>
        {embedUrl ? (
          <iframe
            title=""
            src={embedUrl}
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <span className={styles.mapsPreviewGrain} aria-hidden />
        )}
        <span className={styles.mapsPreviewVeil} aria-hidden />
        <span className={styles.mapsPreviewFoil} aria-hidden />
        <a
          className={styles.mapsPreviewHit}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          data-testid="fashion-maps-cta"
          aria-label={`Open ${label || "the venue"} in Google Maps`}
        >
          <span className={styles.mapsPreviewHint}>Tap to open directions</span>
        </a>
      </div>
    </div>
  );
}
