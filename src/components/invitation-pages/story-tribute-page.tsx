"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Couple story (wedding) or obituary/biography (funeral). */
export function StoryTributePage({ context, page }: InvitePageProps) {
  const { event, theme, category } = context;
  const isFuneral = category === "funeral";
  if (!event.description) return null;

  const deceasedName = isFuneral ? resolveDeceasedName(event) : null;

  return (
    <PageFrame pageId={page.id} label={page.label}>
      {isFuneral ? (
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header">
              <MotifGlyph glyphId={theme.motif.placements.coverTop} size={44} />
              <p className="inv-eyebrow">In loving memory</p>
              <h2 className="inv-heading">A life beautifully lived</h2>
              {deceasedName && (
                <p className="inv-memorial-lead">
                  Remembering <span className="inv-memorial-name">{deceasedName}</span>
                </p>
              )}
            </div>
          </EntranceReveal>
          {event.coverImageUrl && (
            <EntranceReveal delay={0.08}>
              <figure className="inv-memorial-portrait">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.coverImageUrl}
                  alt={`Portrait of ${deceasedName ?? "the deceased"}`}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="inv-eyebrow">Forever in our hearts</figcaption>
              </figure>
            </EntranceReveal>
          )}
          <EntranceReveal delay={0.14}>
            <blockquote className="inv-memorial-tribute">{event.description}</blockquote>
          </EntranceReveal>
          <div className="inv-divider">
            <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
          </div>
        </div>
      ) : (
        <>
          <EntranceReveal>
            <p className="inv-eyebrow">Our story</p>
            <h2 className="inv-heading">How it began</h2>
          </EntranceReveal>
          {event.coverImageUrl && (
            <EntranceReveal delay={0.08}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.coverImageUrl}
                alt="Photo"
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
          <div className="inv-divider">
            <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
          </div>
        </>
      )}
    </PageFrame>
  );
}
