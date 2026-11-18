"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import {
  Experience3ChipRow,
  Experience3SoftCard,
} from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_BABY_SHOWER } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BabyShowerTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Gathering",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Home / venue",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Attire", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BABY_SHOWER}
      tone="light"
      composition="shower"
      headline={props.event.title}
      kicker="A soft gathering"
      welcomeEyebrow="Dear guest"
      welcomeLede="Please join us for a gentle celebration."
    >
      <Experience3ChipRow tone="light" chips={["Soft gathering", "Gifts welcome", "Joy"]} />
      <Experience3SoftCard tone="light" title="With love">
        Modern minimalist shower: rounded surfaces, soft blush accent, quiet motion—never a recycled
        wedding hero with pastel swaps.
      </Experience3SoftCard>
      <section aria-label="Shower note">
        <p className={styles.note}>
          Gift details appear only when the host configures them. Motion stays gentle; no intrusive
          audio.
        </p>
      </section>
      <Experience3EssentialsTimeline beats={beats} heading="Shower schedule" tone="light" />
    </Experience3Shell>
  );
}
