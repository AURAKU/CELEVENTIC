"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3AgendaTable } from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_CORPORATE_GALA } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3CorporateGalaTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const timeLabel = date.time || "Evening";

  const agenda = [
    { time: timeLabel, item: "Reception & welcome" },
    { time: "Programme", item: props.event.title },
    props.event.venueName
      ? { time: "Venue", item: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · ") }
      : null,
    props.event.dressCode ? { time: "Attire", item: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ time: string; item: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_CORPORATE_GALA}
      tone="dark"
      composition="gala"
      headline={props.event.title}
      kicker="Executive evening"
      welcomeEyebrow="Guest of honour"
      welcomeLede="Your seat is reserved for the gala."
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Gala briefing">
        <p className={styles.note} style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.78rem" }}>
          Navy field · gold accent · uppercase hierarchy — executive editorial, not a fashion launch clone.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Doors open in"
        tone="dark"
      />
      <Experience3AgendaTable rows={agenda} tone="dark" heading="Evening programme" />
    </Experience3Shell>
  );
}
