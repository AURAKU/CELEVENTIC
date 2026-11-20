"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3DateLockup,
  Experience3JourneyNote,
} from "@/components/invitation/experience3/modules/editorial-lockups";
import {
  Experience3ChipRow,
  Experience3SoftCard,
  Experience3ToastList,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_BIRTHDAY_CELEBRATION } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BirthdayCelebrationTemplate(props: InvitationRendererProps) {
  const headline = props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const celebrant = props.event.hostName || "the birthday star";

  const beats = [
    {
      label: "Doors open",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "The place",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "The look", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BIRTHDAY_CELEBRATION}
      tone="dark"
      composition="celebration"
      frameMode="bleed"
      headline={headline}
      kicker="Milestone night"
      welcomeEyebrow="You're on the list"
      welcomeLede={`Come celebrate ${celebrant}.`}
      hideDefaultMeta
      heroMode="poster"
      customHero={
        <div style={{ display: "grid", gap: "0.5rem", color: "#faf5ff" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(250,245,255,0.8)" }}>
            Milestone night
          </p>
          <h1
            className={styles.title}
            style={{
              color: "#faf5ff",
              fontFamily: "var(--ix3-heading, Georgia, serif)",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: "0.01em",
              maxWidth: "14ch",
            }}
          >
            {headline}
          </h1>
          <p className={styles.lede} style={{ color: "rgba(250,245,255,0.88)" }}>
            Lights low. Friends close. A night that feels like {celebrant}.
          </p>
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3ChipRow
          tone="dark"
          chips={["Toasts", "Playlist", "Midnight cake", "Photo booth"]}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3SoftCard tone="dark" title={`For ${celebrant}`}>
          {props.event.message ||
            "This celebration is personal—toasts, dancing, and the kind of joy you only get once a year. Bring your energy and your favourite stories."}
        </Experience3SoftCard>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3ToastList
          tone="dark"
          items={[
            `A toast for ${celebrant}`,
            "Stories from the year that shaped this milestone",
            "Dancing until the playlist runs out",
          ]}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3VenuePanel
          tone="dark"
          heading="Where we meet"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3DateLockup
          tone="dark"
          label="Party night"
          weekday={date.weekday}
          day={date.day}
          month={date.month}
          year={date.year}
          time={date.time}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EssentialsTimeline beats={beats} heading="Night rhythm" tone="dark" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Party starts in"
          tone="dark"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="dark"
          title="Guest journey"
          body="Step into the celebration, skim the toast list, RSVP with your party size, and keep your admission QR for the door."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
