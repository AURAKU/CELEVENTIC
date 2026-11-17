"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { IX3_BRAND_LAUNCH } from "@/lib/invitation/studio3/reference-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BrandLaunchTemplate(props: InvitationRendererProps) {
  const brand = props.event.hostName || props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Reveal",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Location",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Attire", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BRAND_LAUNCH}
      tone="dark"
      headline={props.event.title}
      kicker="Private launch experience"
      monogram={brand.slice(0, 1).toUpperCase()}
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Launch briefing">
        <p className={styles.note} style={{ letterSpacing: "0.03em", fontSize: "0.95rem" }}>
          A refined reveal evening for {brand}. Arrival details and guest admission appear on your
          personal pass when provided.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Launch countdown"
        tone="dark"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Event programme" tone="dark" />
    </Experience3Shell>
  );
}
