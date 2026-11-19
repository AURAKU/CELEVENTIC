"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3LineupList,
  Experience3TicketStub,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_CONCERT_NIGHT } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3ConcertNightTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const venue = [props.event.venueName, props.event.landmark].filter(Boolean).join(" · ") || "Venue TBA";
  const host = props.event.hostName;

  const beats = [
    {
      label: "Doors",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    { label: "Stage", detail: venue },
    props.event.dressCode ? { label: "Look", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  const lineup = [host, props.event.title].filter((value, index, arr): value is string =>
    Boolean(value) && arr.indexOf(value) === index
  );

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
      hideDefaultMeta
      heroMode="center"
      heroSubline="One night. One stage."
    >
      <Experience3SectionReveal>
        <Experience3TicketStub
          tone="dark"
          title={props.event.title}
          subtitle={host || "Live night"}
          meta={`${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""} · ${venue}`}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <section aria-label="Concert note">
          <p className={styles.note}>
            Immersive entertainment energy—bold type, stage-black wash, and a ticket-forward reveal
            built for the night ahead.
          </p>
        </section>
      </Experience3SectionReveal>
      {lineup.length ? (
        <Experience3SectionReveal delay={1}>
          <Experience3LineupList tone="dark" heading="On the bill" items={lineup.slice(0, 4)} />
        </Experience3SectionReveal>
      ) : null}
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Showtime"
          tone="dark"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EssentialsTimeline beats={beats} heading="Set timing" tone="dark" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="dark"
          heading="Venue"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
