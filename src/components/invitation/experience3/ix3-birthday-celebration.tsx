"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3ChipRow,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_BIRTHDAY_CELEBRATION } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BirthdayCelebrationTemplate(props: InvitationRendererProps) {
  const headline = props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const host = props.event.hostName || "the host";

  const beats = [
    {
      label: "Arrive",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Venue",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Look", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BIRTHDAY_CELEBRATION}
      tone="dark"
      composition="celebration"
      headline={headline}
      kicker="You're invited to celebrate"
      welcomeEyebrow="Party pass"
      welcomeLede={`Save the night with ${host}.`}
      hideDefaultMeta
      heroMode="poster"
      heroSubline="A night made for memories"
    >
      <Experience3SectionReveal>
        <Experience3ChipRow tone="dark" chips={["Celebrate", "Dance", "Toast", "Memories"]} />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <section aria-label="Celebration note">
          <p className={styles.note} style={{ letterSpacing: "0.01em" }}>
            Lights low, music high, and a celebration that feels personal—come ready to mark the
            milestone with good company.
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Party starts in"
          tone="dark"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EssentialsTimeline beats={beats} heading="Night plan" tone="dark" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="dark"
          heading="Where we meet"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
