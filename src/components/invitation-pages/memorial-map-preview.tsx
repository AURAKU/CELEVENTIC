"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";

type MemorialMapPreviewProps = {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
};

/**
 * Always-on Google Maps glimpse for funeral details — framed to match memorial chrome.
 */
export function MemorialMapPreview({
  mapsLink,
  venueName,
  landmark,
}: MemorialMapPreviewProps) {
  const title = venueName?.trim() || landmark?.trim() || "Service venue";
  const label = [venueName, landmark].filter(Boolean).join(" · ");
  const embedUrl = toMapsEmbedUrl(mapsLink, label || title);
  const directionsUrl = buildDirectionsUrl({ mapsLink, venueName, landmark });

  if (!embedUrl && !directionsUrl) return null;

  return (
    <figure className="inv-memorial-map" aria-label={`Map of ${title}`}>
      <div className="inv-memorial-map-frame">
        {embedUrl ? (
          <>
            <iframe
              title={`Google Map preview — ${title}`}
              src={embedUrl}
              className="inv-memorial-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <span className="inv-memorial-map-veil" aria-hidden />
          </>
        ) : (
          <div className="inv-memorial-map-fallback" aria-hidden>
            <MapPin size={28} strokeWidth={1.5} />
          </div>
        )}

        <figcaption className="inv-memorial-map-caption">
          <span className="inv-memorial-map-pin" aria-hidden>
            <MapPin size={14} strokeWidth={2.25} />
          </span>
          <span className="inv-memorial-map-copy">
            <span className="inv-memorial-map-venue">{title}</span>
            {landmark && venueName ? (
              <span className="inv-memorial-map-landmark">{landmark}</span>
            ) : null}
          </span>
        </figcaption>

        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inv-memorial-map-hit"
            aria-label={`Open ${title} in Google Maps`}
          >
            <span className="inv-memorial-map-directions">
              <ExternalLink size={13} aria-hidden />
              Open in Maps
            </span>
          </a>
        ) : null}
      </div>
    </figure>
  );
}
