"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3AgendaTable,
  Experience3OrnamentRule,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_CORPORATE_GALA } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3CorporateGalaTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const timeLabel = date.time || "Evening";
  const host = props.event.hostName;

  const agenda = [
    { time: timeLabel, item: "Reception & welcome" },
    { time: "Programme", item: props.event.title },
    host ? { time: "Hosted by", item: host } : null,
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
      kicker="Black-tie evening"
      welcomeEyebrow="Guest of honour"
      welcomeLede="Your presence is requested for the gala."
      hideDefaultMeta
      heroMode="center"
      heroSubline={`${date.weekday} · ${date.day} ${date.month} ${date.year}`}
    >
      <Experience3SectionReveal>
        <Experience3OrnamentRule tone="dark" mark="◆" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <section aria-label="Gala briefing">
          <p
            className={styles.note}
            style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            An exclusive evening of recognition, conversation, and refined hospitality.
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Doors open in"
          tone="dark"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3AgendaTable rows={agenda} tone="dark" heading="Evening programme" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="dark"
          heading="Arrival"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
