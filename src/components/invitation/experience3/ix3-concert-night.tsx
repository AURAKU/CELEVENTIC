"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3JourneyNote } from "@/components/invitation/experience3/modules/editorial-lockups";
import {
  Experience3LineupList,
  Experience3StageCue,
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
  const headliner = props.event.hostName || props.event.title;
  const support = props.event.title !== headliner ? props.event.title : null;

  const beats = [
    {
      label: "Doors",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    { label: "Stage", detail: venue },
    props.event.dressCode ? { label: "Look", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  const lineup = [headliner, support, "Special guests"].filter(
    (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index
  );

  return (
    <Experience3Shell
      {...props}
      definition={IX3_CONCERT_NIGHT}
      tone="dark"
      composition="concert"
      frameMode="ticket"
      headline={props.event.title}
      kicker="Live performance"
      welcomeEyebrow="Floor access"
      welcomeLede="Your pass is ready—arrive early for soundcheck energy."
      hideDefaultMeta
      heroMode="center"
      customHero={
        <div style={{ display: "grid", gap: "0.55rem", justifyItems: "center", textAlign: "center" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(255,255,255,0.78)" }}>
            Tonight only
          </p>
          <h1
            className={styles.title}
            style={{
              color: "#f8fafc",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              fontSize: "clamp(1.45rem, 5vw, 2rem)",
              maxWidth: "18ch",
            }}
          >
            {props.event.title}
          </h1>
          <p className={styles.lede} style={{ color: "rgba(226,232,240,0.9)" }}>
            {headliner}
          </p>
          <p
            className={styles.eyebrow}
            style={{ color: "rgba(148,163,184,0.95)", letterSpacing: "0.28em" }}
          >
            {date.day} {date.month} · {venue}
          </p>
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3TicketStub
          tone="dark"
          title={headliner}
          subtitle="Admit one · live night"
          meta={`${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""} · ${venue}`}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3StageCue
          tone="dark"
          doors={`${date.weekday}${date.time ? ` · ${date.time}` : ""}`}
          stage={venue}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3LineupList tone="dark" heading="On the bill" items={lineup.slice(0, 4)} />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <section aria-label="Stage note">
          <p className={styles.note}>
            Lights down, bass up—this is a night-of experience, not a static poster. Follow the set
            timing, claim your spot on the floor, and keep your pass ready at the door.
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EssentialsTimeline beats={beats} heading="Set timing" tone="dark" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Showtime"
          tone="dark"
        />
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
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="dark"
          title="Night-of path"
          body="Scan the stub, check doors and stage cues, claim your admission reply, then present your QR at entry."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
