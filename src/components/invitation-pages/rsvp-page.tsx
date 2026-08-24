"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { RsvpBlock } from "./blocks/rsvp-block";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

export function RsvpPage({ context, page }: InvitePageProps) {
  const isFuneral = context.category === "funeral";
  const deceasedName = isFuneral ? resolveDeceasedName(context.event) : null;

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      {isFuneral ? (
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header">
              <MotifGlyph glyphId={context.theme.motif.placements.coverTop} size={40} />
              <p className="inv-eyebrow">Attendance</p>
              <h2 className="inv-heading">Will you join the family?</h2>
              <p className="inv-body inv-muted inv-memorial-lead">
                Your presence would comfort the family of{" "}
                <span className="inv-memorial-name">{deceasedName}</span> during this solemn
                gathering.
              </p>
            </div>
          </EntranceReveal>
          {context.invitation.message && (
            <EntranceReveal delay={0.08}>
              <blockquote className="inv-memorial-quote">{context.invitation.message}</blockquote>
            </EntranceReveal>
          )}
          <EntranceReveal delay={0.14} className="w-full">
            <RsvpBlock context={context} />
          </EntranceReveal>
        </div>
      ) : (
        <>
          <EntranceReveal>
            <p className="inv-eyebrow">RSVP</p>
            <h2 className="inv-heading">Will you celebrate with us?</h2>
          </EntranceReveal>
          {context.invitation.message && (
            <EntranceReveal delay={0.08}>
              <p className="inv-body inv-muted">{context.invitation.message}</p>
            </EntranceReveal>
          )}
          <EntranceReveal delay={0.14} className="w-full">
            <RsvpBlock context={context} />
          </EntranceReveal>
        </>
      )}
    </PageFrame>
  );
}
