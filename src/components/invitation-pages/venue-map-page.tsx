"use client";

import { PageFrame } from "./page-frame";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { SmartMapBlock } from "./blocks/smart-map-block";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

export function VenueMapPage({ context, page }: InvitePageProps) {
  const { event } = context;

  return (
    <PageFrame pageId={page.id} label={page.label}>
      <EntranceReveal>
        <p className="inv-eyebrow">Getting there</p>
        {event.venueName && <h2 className="inv-heading">{event.venueName}</h2>}
      </EntranceReveal>
      <EntranceReveal delay={0.1} className="w-full">
        <SmartMapBlock context={context} />
      </EntranceReveal>
    </PageFrame>
  );
}
