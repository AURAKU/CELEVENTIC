"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Couple story (wedding) or obituary/biography (funeral). */
export function StoryTributePage({ context, page }: InvitePageProps) {
  const { event, theme, category } = context;
  const isFuneral = category === "funeral";
  if (!event.description) return null;

  return (
    <PageFrame pageId={page.id} label={page.label}>
      <EntranceReveal>
        <p className="inv-eyebrow">{isFuneral ? "In loving memory" : "Our story"}</p>
        <h2 className="inv-heading">
          {isFuneral ? "A life beautifully lived" : "How it began"}
        </h2>
      </EntranceReveal>
      {event.coverImageUrl && (
        <EntranceReveal delay={0.08}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.coverImageUrl}
            alt={isFuneral ? "Portrait" : "Photo"}
            loading="lazy"
            decoding="async"
            style={{
              width: "min(14rem, 55vw)",
              aspectRatio: "1",
              objectFit: "cover",
              borderRadius: "var(--inv-radius)",
              boxShadow: "var(--inv-shadow)",
            }}
          />
        </EntranceReveal>
      )}
      <EntranceReveal delay={0.14}>
        <p className="inv-body" style={{ whiteSpace: "pre-line" }}>
          {event.description}
        </p>
      </EntranceReveal>
      {isFuneral && (
        <EntranceReveal delay={0.2}>
          <p className="inv-script">Forever in our hearts</p>
        </EntranceReveal>
      )}
      <div className="inv-divider">
        <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
      </div>
    </PageFrame>
  );
}
