"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3ChipRow,
  Experience3SoftCard,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_BABY_SHOWER } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BabyShowerTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const host = props.event.hostName;

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
      hideDefaultMeta
      heroMode="stacked"
      heroSubline={host ? `Hosted by ${host}` : null}
    >
      <Experience3SectionReveal>
        <Experience3ChipRow tone="light" chips={["Soft gathering", "Warm company", "Joy"]} />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3SoftCard tone="light" title="With love">
          A modern, intimate shower—quiet joy, gentle motion, and space to celebrate the little one
          on the way.
        </Experience3SoftCard>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <section aria-label="Shower note">
          <p className={styles.note}>
            Gift details appear only when the host configures them. Everything else stays soft,
            clear, and welcoming.
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Until we gather"
          tone="light"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EssentialsTimeline beats={beats} heading="Shower schedule" tone="light" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="light"
          heading="Where"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
