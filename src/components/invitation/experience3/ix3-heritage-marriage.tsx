"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3ChipRow,
  Experience3OrnamentRule,
} from "@/components/invitation/experience3/modules/feature-strips";
import { IX3_HERITAGE_MARRIAGE } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts, parseCoupleNames } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3HeritageMarriageTemplate(props: InvitationRendererProps) {
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
          label: "Gathering place",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Traditional attire", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_HERITAGE_MARRIAGE}
      tone="light"
      composition="heritage"
      headline={headline}
      monogram={monogram}
      kicker="In the tradition of our families"
      welcomeEyebrow="Blessed presence"
      welcomeLede="Your blessing completes this ceremony."
    >
      <Experience3OrnamentRule tone="light" />
      <Experience3ChipRow
        tone="light"
        chips={["Heritage rites", "Family blessing", "Feasting"].filter(Boolean)}
      />
      <section aria-label="Heritage note">
        <p className={styles.note}>
          Warm parchment, ceremonial typography, and an envelope opening—composed for traditional
          marriage gatherings. Distinct from the editorial wedding reference.
        </p>
      </section>
      <Experience3EventCountdown
        startAtIso={props.event.startDateRaw}
        label="Until the ceremony"
        tone="light"
      />
      <Experience3EssentialsTimeline beats={beats} heading="Ceremony programme" tone="light" />
    </Experience3Shell>
  );
}
