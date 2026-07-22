"use client";

import { MapPin, Navigation, CarFront } from "lucide-react";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import {
  buildBoltDeepLink,
  buildUberDeepLink,
  parseLatLngFromMapsLink,
} from "@/lib/invitation/ride-links";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/**
 * Smart map: directions link + landmark text + ride-hailing deep links.
 * Ghana addressing reality — landmarks beat street addresses, so the landmark
 * line is first-class content, not an afterthought. No map iframe (page-weight
 * budget); link-outs only.
 */
export function SmartMapBlock({ context }: { context: PageRenderContext }) {
  const { event, invitation, guestId } = context;
  const directionsUrl = buildDirectionsUrl({
    mapsLink: event.mapsLink,
    venueName: event.venueName,
    landmark: event.landmark,
  });
  const address = [event.venueName, event.landmark].filter(Boolean).join(", ");
  const coords = parseLatLngFromMapsLink(event.mapsLink);

  if (!directionsUrl) return null;

  function track(action: string) {
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action },
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inv-btn inv-btn-primary"
          onClick={() => track("directions")}
        >
          <Navigation size={17} aria-hidden />
          Get directions
        </a>
        {address && (
          <a
            href={buildUberDeepLink({ address })}
            target="_blank"
            rel="noopener noreferrer"
            className="inv-btn inv-btn-secondary"
            onClick={() => track("uber")}
          >
            <CarFront size={17} aria-hidden />
            Uber
          </a>
        )}
        {coords && (
          <a
            href={buildBoltDeepLink(coords)}
            target="_blank"
            rel="noopener noreferrer"
            className="inv-btn inv-btn-secondary"
            onClick={() => track("bolt")}
          >
            <CarFront size={17} aria-hidden />
            Bolt
          </a>
        )}
      </div>
      {event.landmark && (
        <p className="inv-body inv-muted flex items-center gap-1.5 justify-center">
          <MapPin size={15} aria-hidden />
          {event.landmark}
        </p>
      )}
    </div>
  );
}
