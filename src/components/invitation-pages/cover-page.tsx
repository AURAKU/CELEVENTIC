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
import { resolveFuneralCoverCopy, parseMemorialNameCard, resolveMemorialAgeYears } from "@/lib/invite-blueprints/funeral-invitation-copy";
import {
  MEMORIAL_COVER_PORTRAIT_SRC,
  MEMORIAL_SEAL_LIFESPAN,
} from "@/components/experience/memorial-envelope-layout";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

/** Soft ambient backdrop (blurred), used under the framed funeral portrait. */
function CoverAmbientMedia({ url }: { url: string }) {
  return (
    <div className="inv-cover-media inv-cover-media--ambient" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="eager" fetchPriority="high" decoding="async" />
    </div>
  );
}

/** Dark memorial atmosphere when no guest cover photo is set — keeps the seal blending. */
function CoverMemorialAtmosphere() {
  return <div className="inv-cover-media inv-cover-media--memorial-atmosphere" aria-hidden />;
}

/** Full-bleed hero (non-funeral covers). */
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

/** Ornate oval framed memorial portrait — cover hero (not the envelope wax seal). */
function MemorialCoverPortrait({ alt }: { alt: string }) {
  return (
    <figure className="inv-memorial-cover-portrait">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MEMORIAL_COVER_PORTRAIT_SRC}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />
    </figure>
  );
}

export function CoverPage({ context, page }: InvitePageProps) {
  const { event, design, theme, category, guestName } = context;
  const heroUrl =
    event.coverImageUrl ?? design.media?.find((m) => m.role === "hero" && m.type === "image")?.url;
  const dateParts = event.startDateRaw ? formatInvitationDateParts(event.startDateRaw) : null;
  const isFuneral = category === "funeral";
  const funeralPreferred =
    design.studio && "visionBoard" in design.studio
      ? (design.studio as { visionBoard?: { coupleName1?: string } }).visionBoard?.coupleName1
      : undefined;
  const funeralCopy = isFuneral
    ? resolveFuneralCoverCopy(event, design.introText, undefined, funeralPreferred)
    : null;
  const memorialAgeYears = (() => {
    if (!isFuneral) return null;
    const candidates = [
      funeralCopy?.headline,
      funeralPreferred,
      event.deceasedName,
      event.hostName,
      event.title,
    ];
    for (const candidate of candidates) {
      const age = resolveMemorialAgeYears(parseMemorialNameCard(candidate ?? "").years);
      if (age != null) return age;
    }
    // Match the lifespan embossed on the memorial portrait wax-seal art.
    return resolveMemorialAgeYears(MEMORIAL_SEAL_LIFESPAN);
  })();

  const names = isFuneral
    ? funeralCopy!.headline
    : (() => {
        const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
        return name2 ? `${name1} & ${name2}` : name1;
      })();

  const memorialNameCard = isFuneral ? parseMemorialNameCard(names) : null;
  const memorialPrimaryLine = memorialNameCard
    ? [memorialNameCard.honorific, memorialNameCard.primary].filter(Boolean).join(" ")
    : "";

  const introText = isFuneral
    ? funeralCopy!.eyebrow
    : (design.introText ?? "Together with their families");

  const subtitle = isFuneral ? funeralCopy!.subtitle : null;

  const coverBody = (
    <>
      {!isFuneral || !heroUrl ? (
        <DriftLayer>
          <MotifGlyph glyphId={theme.motif.placements.coverTop} size={56} />
        </DriftLayer>
      ) : null}
      <EntranceReveal>
        <p className="inv-eyebrow">{introText}</p>
      </EntranceReveal>
      <EntranceReveal delay={0.08}>
        {isFuneral && memorialNameCard?.aka ? (
          <h1 className="inv-display inv-foil-text inv-cover-honouree" aria-label={names}>
            <span className="inv-cover-honouree-primary">{memorialPrimaryLine}</span>
            <span className="inv-cover-honouree-aka">
              <span className="inv-cover-honouree-aka-label">A.K.A</span>{" "}
              <span className="inv-cover-honouree-aka-name">{memorialNameCard.aka}</span>
            </span>
          </h1>
        ) : (
          <h1 className="inv-display inv-foil-text">{names}</h1>
        )}
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
      {!isFuneral || !heroUrl ? (
        <DriftLayer phase={0.8}>
          <MotifGlyph glyphId={theme.motif.placements.coverBottom} size={56} />
        </DriftLayer>
      ) : null}
    </>
  );

  if (isFuneral) {
    return (
      <PageFrame
        pageId={page.id}
        label={page.label}
        frameless
        hasMedia
        media={heroUrl ? <CoverAmbientMedia url={heroUrl} /> : <CoverMemorialAtmosphere />}
      >
        <div className="inv-funeral-cover-stack">
          <EntranceReveal className="inv-funeral-cover-portrait-wrap">
            <div className="inv-funeral-cover-portrait-stage">
              <span className="inv-funeral-cover-portrait-glow" aria-hidden />
              <MemorialCoverPortrait
                alt={`Memorial portrait of ${typeof names === "string" ? names : "the deceased"}`}
              />
              {memorialAgeYears != null ? (
                <div
                  className="inv-memorial-age-seal"
                  aria-label={`Aged ${memorialAgeYears}`}
                >
                  <span className="inv-memorial-age-seal__ring" aria-hidden />
                  <span className="inv-memorial-age-seal__label">Aged</span>
                  <span className="inv-memorial-age-seal__value">{memorialAgeYears}</span>
                </div>
              ) : null}
            </div>
          </EntranceReveal>
          <div className="inv-cover-hero-panel">{coverBody}</div>
        </div>
      </PageFrame>
    );
  }

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
