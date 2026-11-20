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
  Experience3DiplomaFrame,
  Experience3OrnamentRule,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_GRADUATION } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3GraduationTemplate(props: InvitationRendererProps) {
  const graduate = props.event.hostName || props.event.title;
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

  const beats = [
    {
      label: "Procession",
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
      frameMode="folio"
      headline={props.event.title}
      kicker="Commencement"
      welcomeEyebrow="Honored guest"
      welcomeLede="Stand with us as this chapter closes and the next begins."
      hideDefaultMeta
      heroMode="stacked"
      customHero={
        <div style={{ display: "grid", gap: "0.55rem", color: "#f8fafc" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(248,250,252,0.82)" }}>
            Commencement
          </p>
          <h1
            className={styles.title}
            style={{ color: "#f8fafc", fontWeight: 500, maxWidth: "16ch", letterSpacing: "0.01em" }}
          >
            {props.event.title}
          </h1>
          <p className={styles.lede} style={{ color: "rgba(226,232,240,0.92)" }}>
            Achievement · Progression · Celebration
          </p>
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3OrnamentRule tone="light" mark="❖" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3DiplomaFrame
          tone="light"
          title={graduate}
          lede="Presented with pride on the occasion of commencement—years of study, sealed with honour."
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3DateLockup
          tone="light"
          label="Ceremony"
          weekday={date.weekday}
          day={date.day}
          month={date.month}
          year={date.year}
          time={date.time}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <section aria-label="Milestone narrative">
          <p className={styles.note}>
            {props.event.message ||
              "This invitation marks a milestone earned—procession, recognition, and a gathering of the people who carried the journey."}
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Until commencement"
          tone="light"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EssentialsTimeline beats={beats} heading="Ceremony order" tone="light" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="light"
          heading="Venue"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="light"
          title="Guest journey"
          body="Review the citation, confirm attendance, follow ceremony order, and keep your admission QR for the hall."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
