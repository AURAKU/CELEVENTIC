"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { DriftLayer } from "@/components/motion/drift-layer";
import { useParallax } from "@/components/motion/use-parallax";
import { scrollToInvitePage } from "@/components/invitation-paged/use-active-page";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { resolveFuneralCoverCopy } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Background hero layer, the only element that parallaxes (text never does). */
function CoverParallaxMedia({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { y } = useParallax(ref, "background");
  return (
    <motion.div ref={ref} className="inv-cover-media" style={{ y }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="eager" fetchPriority="high" decoding="async" />
    </motion.div>
  );
}

export function CoverPage({ context, page }: InvitePageProps) {
  const { event, design, theme, category, guestName } = context;
  const heroUrl =
    event.coverImageUrl ?? design.media?.find((m) => m.role === "hero" && m.type === "image")?.url;
  const dateParts = event.startDateRaw ? formatInvitationDateParts(event.startDateRaw) : null;
  const isFuneral = category === "funeral";

  const funeralCopy = isFuneral ? resolveFuneralCoverCopy(event, design.introText) : null;

  const names = isFuneral
    ? funeralCopy!.headline
    : (() => {
        const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
        return name2 ? `${name1} & ${name2}` : name1;
      })();

  const introText = isFuneral
    ? funeralCopy!.eyebrow
    : (design.introText ?? "Together with their families");

  const subtitle = isFuneral ? funeralCopy!.subtitle : null;

  const coverBody = (
    <>
      <DriftLayer>
        <MotifGlyph glyphId={theme.motif.placements.coverTop} size={56} />
      </DriftLayer>
      <EntranceReveal>
        <p className="inv-eyebrow">{introText}</p>
      </EntranceReveal>
      <EntranceReveal delay={0.08}>
        <h1 className="inv-display inv-foil-text">{names}</h1>
      </EntranceReveal>
      {isFuneral && subtitle && (
        <EntranceReveal delay={0.11}>
          <p className="inv-cover-subtitle">{subtitle}</p>
        </EntranceReveal>
      )}
      {guestName && (
        <EntranceReveal delay={0.14}>
          <p className="inv-script">Dear {guestName}, you are warmly invited</p>
        </EntranceReveal>
      )}
      <EntranceReveal delay={0.2}>
        <div className="inv-divider">
          <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
        </div>
        {(dateParts || event.venueName) && (
          <dl className="inv-cover-meta">
            {dateParts && (
              <div className="inv-cover-meta-chip">
                <dt>{isFuneral ? "Date & time" : "When"}</dt>
                <dd>
                  {dateParts.weekday}, {dateParts.month} {dateParts.day}, {dateParts.year}
                  {dateParts.time ? ` · ${dateParts.time}` : ""}
                </dd>
              </div>
            )}
            {event.venueName && (
              <div className="inv-cover-meta-chip">
                <dt>{isFuneral ? "Service venue" : "Where"}</dt>
                <dd>{event.venueName}</dd>
              </div>
            )}
            {isFuneral && event.dressCode && (
              <div className="inv-cover-meta-chip">
                <dt>Dress</dt>
                <dd>{event.dressCode}</dd>
              </div>
            )}
          </dl>
        )}
      </EntranceReveal>
      {isFuneral && (
        <EntranceReveal delay={0.26}>
          <div className="inv-cover-quick-nav">
            <button
              type="button"
              className="inv-btn inv-btn-primary"
              onClick={() => scrollToInvitePage("details")}
            >
              View arrangements
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              onClick={() => scrollToInvitePage("rsvp")}
            >
              Confirm attendance
            </button>
          </div>
        </EntranceReveal>
      )}
      <DriftLayer phase={0.8}>
        <MotifGlyph glyphId={theme.motif.placements.coverBottom} size={56} />
      </DriftLayer>
    </>
  );

  return (
    <PageFrame
      pageId={page.id}
      label={page.label}
      frameless
      hasMedia={Boolean(heroUrl)}
      media={heroUrl ? <CoverParallaxMedia url={heroUrl} /> : undefined}
    >
      {heroUrl ? <div className="inv-cover-hero-panel">{coverBody}</div> : coverBody}
    </PageFrame>
  );
}
