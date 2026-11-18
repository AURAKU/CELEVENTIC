"use client";

import type { Experience3Definition } from "@/lib/invitation/studio3/experience-definition";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

type Composition =
  | "editorial"
  | "launch"
  | "memorial"
  | "heritage"
  | "celebration"
  | "gala"
  | "concert"
  | "academic"
  | "shower";

type FamilyTemplateConfig = {
  definition: Experience3Definition;
  tone: "light" | "dark" | "solemn";
  composition: Composition;
  kicker: string;
  welcomeEyebrow: string;
  welcomeLede: string;
  note: string;
  scheduleHeading: string;
  showCountdown?: boolean;
  countdownLabel?: string;
  headlineFrom?: "title" | "host" | "deceased";
};

function resolveHeadline(
  props: InvitationRendererProps,
  from: FamilyTemplateConfig["headlineFrom"]
): string {
  if (from === "host") return props.event.hostName || props.event.title;
  if (from === "deceased") {
    return props.event.deceasedName?.trim() || props.event.hostName?.trim() || props.event.title;
  }
  return props.event.title;
}

export function createIx3FamilyTemplate(config: FamilyTemplateConfig) {
  function Ix3FamilyTemplate(props: InvitationRendererProps) {
    const headline = resolveHeadline(props, config.headlineFrom ?? "title");
    const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);

    const beats = [
      {
        label: "When",
        detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
      },
      props.event.venueName || props.event.landmark
        ? {
            label: "Where",
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
        definition={config.definition}
        tone={config.tone}
        composition={config.composition}
        headline={headline}
        kicker={config.kicker}
        welcomeEyebrow={config.welcomeEyebrow}
        welcomeLede={config.welcomeLede}
      >
        <div className={styles.divider} aria-hidden />
        <section aria-label="Invitation note">
          <p className={styles.note}>{config.note}</p>
        </section>
        {config.showCountdown ? (
          <Experience3EventCountdown
            startAtIso={props.event.startDateRaw}
            label={config.countdownLabel ?? "Countdown"}
            tone={config.tone === "solemn" ? "solemn" : config.tone}
          />
        ) : null}
        <Experience3EssentialsTimeline
          beats={beats}
          heading={config.scheduleHeading}
          tone={config.tone}
        />
      </Experience3Shell>
    );
  }

  Ix3FamilyTemplate.displayName = `Ix3Family(${config.definition.layout})`;
  return Ix3FamilyTemplate;
}
