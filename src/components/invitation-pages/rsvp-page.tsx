"use client";

import { PageFrame } from "./page-frame";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { RsvpBlock } from "./blocks/rsvp-block";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

export function RsvpPage({ context, page }: InvitePageProps) {
  const isFuneral = context.category === "funeral";

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      <EntranceReveal>
        <p className="inv-eyebrow">{isFuneral ? "Attendance" : "RSVP"}</p>
        <h2 className="inv-heading">
          {isFuneral ? "Will you attend the service?" : "Will you celebrate with us?"}
        </h2>
      </EntranceReveal>
      {context.invitation.message && (
        <EntranceReveal delay={0.08}>
          <p className="inv-body inv-muted">{context.invitation.message}</p>
        </EntranceReveal>
      )}
      <EntranceReveal delay={0.14} className="w-full">
        <RsvpBlock context={context} />
      </EntranceReveal>
    </PageFrame>
  );
}
