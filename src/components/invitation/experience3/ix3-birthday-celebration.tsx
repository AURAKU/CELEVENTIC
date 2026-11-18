"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3ChipRow } from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_BIRTHDAY_CELEBRATION } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BirthdayCelebrationTemplate(props: InvitationRendererProps) {
  const headline = props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const host = props.event.hostName || "the host";

  const beats = [
    {
      label: "Party",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Venue",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Vibe", detail: props.event.dressCode } : null,
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
    >
      <Experience3ChipRow tone="dark" chips={["Celebrate", "Dance", "Toast", "Memories"]} />
      <section aria-label="Celebration note">
        <p className={styles.note} style={{ letterSpacing: "0.02em" }}>
          Contemporary birthday energy: violet night field, neon-adjacent accents, and a classic
          reveal—built for milestones, not corporate decks.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Party starts in"
        tone="dark"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Celebration plan" tone="dark" />
    </Experience3Shell>
  );
}
