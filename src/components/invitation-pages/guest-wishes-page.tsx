"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { GuestWishesCard } from "@/components/guest-portal/guest-wishes-card";
import { MemorialCandle } from "./memorial-candle";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Condolences / Guest wishes — sits directly above the closing page. */
export function GuestWishesPage({ context, page }: InvitePageProps) {
  const isFuneral = context.category === "funeral";
  const deceasedName = isFuneral ? resolveDeceasedName(context.event) : null;
  const accent =
    context.theme.color.accent ??
    context.design.colors?.accent ??
    (isFuneral ? "#9c3a3a" : "#0B8A83");

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      {isFuneral ? (
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header inv-memorial-panel-header--candles">
              <MemorialCandle side="left" delayMs={280} />
              <div className="inv-memorial-panel-header-copy">
                <MotifGlyph glyphId={context.theme.motif.placements.coverTop} size={40} />
                <p className="inv-eyebrow">Book of Condolences</p>
                <h2 className="inv-heading">Leave a lasting word</h2>
                <p className="inv-body inv-muted inv-memorial-lead">
                  Inscribe a message of comfort for the family of{" "}
                  <span className="inv-memorial-name">{deceasedName}</span>.
                </p>
              </div>
              <MemorialCandle side="right" delayMs={620} />
            </div>
          </EntranceReveal>
          <EntranceReveal delay={0.1} className="w-full">
            <GuestWishesCard
              eventId={context.eventId}
              invitationId={context.invitation.id}
              guestId={context.guestId}
              guestName={context.guestName}
              inviteLink={context.invitation.uniqueLink}
              accentColor={accent}
              memoryVaultEnabled={context.memoryVaultEnabled}
              variant="dark"
              tone="memorial"
              hideHeader
              suppressMemoryHint
            />
          </EntranceReveal>
        </div>
      ) : (
        <>
          <EntranceReveal>
            <p className="inv-eyebrow">Blessings</p>
            <h2 className="inv-heading">Guest wishes</h2>
            <p className="inv-body inv-muted">Leave a blessing for the hosts.</p>
          </EntranceReveal>
          <EntranceReveal delay={0.1} className="w-full">
            <GuestWishesCard
              eventId={context.eventId}
              invitationId={context.invitation.id}
              guestId={context.guestId}
              guestName={context.guestName}
              inviteLink={context.invitation.uniqueLink}
              accentColor={accent}
              memoryVaultEnabled={context.memoryVaultEnabled}
              variant="light"
              tone="celebration"
              hideHeader
              suppressMemoryHint
            />
          </EntranceReveal>
        </>
      )}
    </PageFrame>
  );
}
