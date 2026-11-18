"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { IX3_EDITORIAL_WEDDING } from "@/lib/invitation/studio3/reference-definitions";
import { formatInvitationDateParts, parseCoupleNames } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3EditorialWeddingTemplate(props: InvitationRendererProps) {
  const { name1, name2 } = parseCoupleNames(props.event.title, props.event.hostName);
  const headline = name2 ? `${name1} & ${name2}` : props.event.title;
  const monogram = name2
    ? `${(name1[0] ?? "").toUpperCase()}${(name2[0] ?? "").toUpperCase()}`
    : (name1[0] ?? "C").toUpperCase();
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Ceremony",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Reception venue",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode
      ? { label: "Dress code", detail: props.event.dressCode }
      : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_EDITORIAL_WEDDING}
      tone="light"
      composition="editorial"
      headline={headline}
      monogram={monogram}
      kicker="Together with their families"
      welcomeEyebrow="Reserved for"
      welcomeLede="We would be honored by your presence."
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Wedding note">
        <p className={styles.note}>
          An editorial evening of vows, gathering, and quiet joy—composed with care for the guests who
          make the day complete.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Until we gather"
        tone="light"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Wedding schedule" tone="light" />
    </Experience3Shell>
  );
}
