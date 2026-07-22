"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { DriftLayer } from "@/components/motion/drift-layer";
import { useParallax } from "@/components/motion/use-parallax";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Background hero layer — the only element that parallaxes (text never does). */
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

  const names = isFuneral
    ? event.title.replace(/^celebration of life\s*[—–-]\s*/i, "")
    : (() => {
        const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
        return name2 ? `${name1} & ${name2}` : name1;
      })();

  const introText =
    design.introText ??
    (isFuneral ? "Celebration of Life" : "Together with their families");

  return (
    <PageFrame
      pageId={page.id}
      label={page.label}
      frameless
      hasMedia={Boolean(heroUrl)}
      media={heroUrl ? <CoverParallaxMedia url={heroUrl} /> : undefined}
    >
      <DriftLayer>
        <MotifGlyph glyphId={theme.motif.placements.coverTop} size={56} />
      </DriftLayer>
      <EntranceReveal>
        <p className={isFuneral ? "inv-eyebrow" : "inv-script"}>{introText}</p>
      </EntranceReveal>
      <EntranceReveal delay={0.08}>
        <h1 className="inv-display inv-foil-text">{names}</h1>
      </EntranceReveal>
      {guestName && (
        <EntranceReveal delay={0.14}>
          <p className="inv-script">Dear {guestName}</p>
        </EntranceReveal>
      )}
      <EntranceReveal delay={0.2}>
        <div className="inv-divider">
          <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
        </div>
        {dateParts && (
          <p className="inv-body" style={{ letterSpacing: "0.08em" }}>
            {dateParts.weekday} · {dateParts.month} {dateParts.day}, {dateParts.year}
          </p>
        )}
        {event.venueName && <p className="inv-body inv-muted">{event.venueName}</p>}
      </EntranceReveal>
      <DriftLayer phase={0.8}>
        <MotifGlyph glyphId={theme.motif.placements.coverBottom} size={56} />
      </DriftLayer>
    </PageFrame>
  );
}
