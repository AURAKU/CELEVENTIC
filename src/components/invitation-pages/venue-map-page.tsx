"use client";

import { PageFrame } from "./page-frame";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { SmartMapBlock } from "./blocks/smart-map-block";
import { scrollToInvitePage } from "@/components/invitation-paged/use-active-page";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

export function VenueMapPage({ context, page }: InvitePageProps) {
  const { event, category } = context;
  const isFuneral = category === "funeral";

  return (
    <PageFrame pageId={page.id} label={page.label}>
      {isFuneral ? (
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header">
              <p className="inv-eyebrow">Directions</p>
              {event.venueName && <h2 className="inv-heading">{event.venueName}</h2>}
              <p className="inv-body inv-muted inv-memorial-lead">
                Plan your journey to the service venue. Allow extra time for parking and gathering
                with the family.
              </p>
              {event.landmark && (
                <p className="inv-body inv-muted">
                  Landmark: <span className="inv-memorial-name">{event.landmark}</span>
                </p>
              )}
            </div>
          </EntranceReveal>
          <EntranceReveal delay={0.1} className="w-full">
            <SmartMapBlock context={context} />
          </EntranceReveal>
          <EntranceReveal delay={0.16} className="w-full">
            <div className="inv-cover-quick-nav">
              <button
                type="button"
                className="inv-btn inv-btn-secondary"
                onClick={() => scrollToInvitePage("details")}
              >
                Back to arrangements
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={() => scrollToInvitePage("rsvp")}
              >
                Confirm attendance
              </button>
            </div>
          </EntranceReveal>
        </div>
      ) : (
        <>
          <EntranceReveal>
            <p className="inv-eyebrow">Getting there</p>
            {event.venueName && <h2 className="inv-heading">{event.venueName}</h2>}
          </EntranceReveal>
          <EntranceReveal delay={0.1} className="w-full">
            <SmartMapBlock context={context} />
          </EntranceReveal>
        </>
      )}
    </PageFrame>
  );
}
