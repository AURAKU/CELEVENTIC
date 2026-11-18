"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3DiplomaFrame } from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_GRADUATION } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3GraduationTemplate(props: InvitationRendererProps) {
  const graduate = props.event.hostName || props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Commencement",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Hall",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Attire", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_GRADUATION}
      tone="light"
      composition="academic"
      headline={props.event.title}
      kicker="Commencement invitation"
      welcomeEyebrow="Honored guest"
      welcomeLede="Join us as we celebrate this achievement."
    >
      <Experience3DiplomaFrame
        tone="light"
        title={graduate}
        lede="Presented with pride on the occasion of commencement."
      />
      <section aria-label="Academic note">
        <p className={styles.note}>
          Academic prestige: parchment field, blue accent, portrait opening, and ceremony-first
          order—separate creative DNA from celebration and wedding families.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Until commencement"
        tone="light"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Ceremony order" tone="light" />
    </Experience3Shell>
  );
}
