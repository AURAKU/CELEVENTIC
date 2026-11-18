"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Experience3Definition } from "@/lib/invitation/studio3/experience-definition";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { InvitationActions } from "@/components/invitation/shared/invitation-actions";
import { Experience3OpeningGate } from "@/components/invitation/experience3/modules/opening-gate";
import styles from "./experience3-shell.module.css";

/** Escape quotes for safe CSS url("...") usage. */
function cssUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type Experience3ShellProps = InvitationRendererProps & {
  definition: Experience3Definition;
  tone: "light" | "dark" | "solemn";
  composition?: "editorial" | "launch" | "memorial" | "heritage" | "celebration" | "gala" | "concert" | "academic" | "shower";
  monogram?: string | null;
  headline: string;
  kicker: string;
  welcomeEyebrow?: string;
  welcomeLede?: string;
  children?: ReactNode;
};

function initialsFromTitle(title: string): string {
  const parts = title
    .split(/[&+/]| and /i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (title.trim()[0] ?? "C").toUpperCase();
}

export function Experience3Shell({
  definition,
  tone,
  composition = "editorial",
  monogram,
  headline,
  kicker,
  welcomeEyebrow = "With pleasure",
  welcomeLede = "You are personally invited.",
  invitation,
  event,
  design,
  guestId,
  guestName,
  qrDataUrl,
  entryPass,
  partyAllowance,
  initialRsvpStatus,
  initialAttendingCount,
  children,
}: Experience3ShellProps) {
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const tokens = definition.tokens;
  const showInlineQr = Boolean(qrDataUrl) && !entryPass;
  const resolvedMonogram = monogram ?? initialsFromTitle(event.title);
  const cover = event.coverImageUrl ?? design.media?.find((m) => m.role === "hero")?.url ?? null;
  const portrait =
    design.media?.find((m) => m.role === "share")?.url ??
    design.media?.find((m) => m.role === "intro")?.url ??
    cover;

  const compositionClass =
    composition === "launch"
      ? styles.comp_launch
      : composition === "memorial"
        ? styles.comp_memorial
        : composition === "heritage"
          ? styles.comp_heritage
          : composition === "celebration"
            ? styles.comp_celebration
            : composition === "gala"
              ? styles.comp_gala
              : composition === "concert"
                ? styles.comp_concert
                : composition === "academic"
                  ? styles.comp_academic
                  : composition === "shower"
                    ? styles.comp_shower
                    : styles.comp_editorial;

  return (
    <div
      className={[
        styles.shell,
        tone === "dark" ? styles.dark : "",
        tone === "solemn" ? styles.solemn : "",
        compositionClass,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--ix3-bg": tokens.background,
          "--ix3-surface": tokens.surface,
          "--ix3-text": tokens.text,
          "--ix3-muted": tokens.muted,
          "--ix3-accent": tokens.accent,
          "--ix3-border": tokens.border,
          "--ix3-heading": tokens.headingFont,
          "--ix3-body": tokens.bodyFont,
          "--ix3-eyebrow": tokens.eyebrowFont,
        } as CSSProperties
      }
    >
      <Experience3OpeningGate
        style={definition.opening.style}
        title={headline}
        subtitle={kicker}
        monogram={
          definition.opening.style === "monogram" || definition.opening.style === "cinematic"
            ? resolvedMonogram
            : null
        }
        portraitUrl={definition.opening.style === "portrait" ? portrait : null}
        tone={tone}
        forceInstant={definition.motionIntensity <= 0.25 && definition.opening.style === "minimal-instant"}
      />

      <div className={styles.frame}>
        <article className={styles.surface}>
          <header
            className={styles.hero}
            style={
              cover
                ? {
                    backgroundImage: `linear-gradient(165deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), url("${cssUrl(cover)}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className={styles.heroOverlay}>
              <p className={styles.eyebrow} style={{ color: "rgba(250,250,249,0.8)" }}>
                {kicker}
              </p>
              <h1 className={styles.title} style={{ color: "#fafaf9" }}>
                {headline}
              </h1>
            </div>
          </header>

          <div className={styles.body}>
            {guestName ? (
              <section className={styles.welcome} aria-label="Personalized welcome">
                <p className={styles.eyebrow}>{welcomeEyebrow}</p>
                <p className={styles.title} style={{ fontSize: "1.45rem" }}>
                  {guestName}
                </p>
                <p className={styles.lede}>{welcomeLede}</p>
              </section>
            ) : null}

            {invitation.message ? (
              <section aria-label="Invitation message">
                <p className={styles.lede} style={{ color: tokens.text, fontStyle: "italic" }}>
                  {invitation.message}
                </p>
              </section>
            ) : event.description ? (
              <section aria-label="Event details">
                <p className={styles.lede}>{event.description}</p>
              </section>
            ) : null}

            <section className={styles.metaGrid} aria-label="Event essentials">
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>When</span>
                <span className={styles.metaValue}>
                  {date.weekday}, {date.day} {date.month} {date.year}
                  {date.time ? ` · ${date.time}` : ""}
                </span>
              </div>
              {(event.venueName || event.landmark) && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Where</span>
                  <span className={styles.metaValue}>
                    {event.venueName}
                    {event.landmark ? ` · ${event.landmark}` : ""}
                  </span>
                </div>
              )}
              {event.dressCode ? (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>
                    {definition.designFamily === "memorial" ? "Attire" : "Dress code"}
                  </span>
                  <span className={styles.metaValue}>{event.dressCode}</span>
                </div>
              ) : null}
            </section>

            {children}

            {showInlineQr && qrDataUrl ? (
              <div className="flex justify-center pt-2">
                <Image
                  src={qrDataUrl}
                  alt="Invitation QR code"
                  width={120}
                  height={120}
                  className="rounded-md"
                  unoptimized
                />
              </div>
            ) : null}

            <InvitationRsvpPanel
              invitationId={invitation.id}
              uniqueLink={invitation.uniqueLink}
              guestId={guestId}
              guestName={guestName}
              partyAllowance={partyAllowance}
              initialRsvpStatus={initialRsvpStatus}
              initialAttendingCount={initialAttendingCount}
              accentColor={tokens.accent}
              textColor={tokens.text}
              variant={tone === "dark" ? "dark" : "light"}
              label={definition.designFamily === "memorial" ? "Will you attend?" : undefined}
            />

            <InvitationActions
              event={event}
              pdfUrl={design.media?.find((m) => m.type === "pdf")?.url}
              variant={tone === "dark" ? "dark" : "light"}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
