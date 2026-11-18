"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { IX3_MEMORIAL } from "@/lib/invitation/studio3/reference-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3MemorialTemplate(props: InvitationRendererProps) {
  const remembered =
    props.event.deceasedName?.trim() ||
    props.event.hostName?.trim() ||
    props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Service",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Location",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode
      ? { label: "Attire", detail: props.event.dressCode }
      : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_MEMORIAL}
      tone="solemn"
      composition="memorial"
      headline={remembered}
      kicker="A service of remembrance"
      welcomeEyebrow="With gratitude"
      welcomeLede="Your presence brings comfort to the family."
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Memorial tribute">
        <p className={styles.note}>
          A calm gathering in honor of a life remembered. Motion remains gentle; sound stays optional
          and never intrusive.
        </p>
      </section>
      <Experience3EssentialsTimeline beats={beats} heading="Memorial timeline" tone="solemn" />
    </Experience3Shell>
  );
}
