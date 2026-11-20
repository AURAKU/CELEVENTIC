"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3DateLockup,
  Experience3JourneyNote,
  Experience3NameStack,
} from "@/components/invitation/experience3/modules/editorial-lockups";
import {
  Experience3OrnamentRule,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
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
      frameMode="folio"
      headline={headline}
      monogram={monogram}
      kicker="In the tradition of our families"
      welcomeEyebrow="Blessed presence"
      welcomeLede="Your blessing completes this ceremony."
      hideDefaultMeta
      heroMode="stacked"
      customHero={
        <div style={{ display: "grid", gap: "0.65rem", color: "#fafaf9" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(250,250,249,0.82)" }}>
            In the tradition of our families
          </p>
          <h1 className="sr-only">{headline}</h1>
          <Experience3NameStack name1={name1} name2={name2} tone="dark" />
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3OrnamentRule tone="light" mark="◈" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3DateLockup
          tone="light"
          label="Ceremony day"
          weekday={date.weekday}
          day={date.day}
          month={date.month}
          year={date.year}
          time={date.time}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <section aria-label="Heritage note">
          <p className={styles.note}>
            {props.event.message ||
              "With reverence for custom and the warmth of family, we invite you to witness the joining of two houses—libation, blessing, and celebration shared together."}
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Until the ceremony"
          tone="light"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3EssentialsTimeline beats={beats} heading="Ceremony programme" tone="light" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3VenuePanel
          tone="light"
          heading="Reception"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="light"
          title="Guest journey"
          body="Open the seal, review the ceremony details, confirm your attendance, and keep your admission QR ready for the gathering."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
