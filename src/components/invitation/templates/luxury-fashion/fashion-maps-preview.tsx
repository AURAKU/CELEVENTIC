"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { formatFashionVenueLine } from "@/lib/experience/luxury-fashion";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { resolveMapsLocationHref } from "@/lib/invitation/maps-utils";
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
  const staticPreview = useInvitationStaticPreview();
  const label = formatFashionVenueLine(locationName, address);
  const href = resolveMapsLocationHref({ mapsUrl, locationName, address });
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

  const openLocation = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      onOpen?.();
      if (!href) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [href, onOpen]
  );

  if (!href) return null;

  const hit = staticPreview ? (
    <button
      type="button"
      className={styles.mapsPreviewHit}
      onClick={openLocation}
      data-testid="fashion-maps-cta"
      aria-label={`Open ${label || "the venue"} in Google Maps`}
    >
      <span className={styles.mapsPreviewHint}>Tap to open directions</span>
    </button>
  ) : (
    <a
      className={styles.mapsPreviewHit}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openLocation}
      data-testid="fashion-maps-cta"
      aria-label={`Open ${label || "the venue"} in Google Maps`}
    >
      <span className={styles.mapsPreviewHint}>Tap to open directions</span>
    </a>
  );

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
        {hit}
      </div>
    </div>
  );
}
