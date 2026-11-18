"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3TicketStub } from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_CONCERT_NIGHT } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3ConcertNightTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const venue = [props.event.venueName, props.event.landmark].filter(Boolean).join(" · ") || "Venue TBA";

  const beats = [
    {
      label: "Doors",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    { label: "Stage", detail: venue },
    props.event.dressCode ? { label: "Look", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_CONCERT_NIGHT}
      tone="dark"
      composition="concert"
      headline={props.event.title}
      kicker="Live performance"
      welcomeEyebrow="Admit one"
      welcomeLede="Your ticket is waiting—see you on the floor."
    >
      <Experience3TicketStub
        tone="dark"
        title={props.event.title}
        subtitle={props.event.hostName || "Live night"}
        meta={`${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""} · ${venue}`}
      />
      <section aria-label="Concert note">
        <p className={styles.note}>
          Immersive entertainment: stage-black wash, cyan accent glow, cinematic open, and
          ticket-forward storytelling.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Showtime"
        tone="dark"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Set timing" tone="dark" />
    </Experience3Shell>
  );
}
