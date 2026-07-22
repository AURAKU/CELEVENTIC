"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { CountdownBlock } from "./blocks/countdown-block";
import { ViralFooterBlock } from "./blocks/viral-footer-block";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Page 10 — thank-you + countdown + the always-on viral footer. */
export function ClosingPage({ context, page }: InvitePageProps) {
  const { theme, category, design } = context;
  const isFuneral = category === "funeral";
  const thankYou =
    design.experience?.thankYouMessage ??
    (isFuneral
      ? "The family is grateful for your love, prayers, and support."
      : "We can't wait to celebrate with you.");

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      <EntranceReveal>
        <MotifGlyph glyphId={theme.motif.placements.coverTop} size={48} />
        <p className="inv-script">{isFuneral ? "With gratitude" : "Thank you"}</p>
      </EntranceReveal>
      <EntranceReveal delay={0.08}>
        <p className="inv-body">{thankYou}</p>
      </EntranceReveal>
      <EntranceReveal delay={0.14} className="w-full">
        <CountdownBlock context={context} />
      </EntranceReveal>
      <div className="inv-divider">
        <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
      </div>
      <EntranceReveal delay={0.2}>
        <ViralFooterBlock context={context} />
      </EntranceReveal>
    </PageFrame>
  );
}
