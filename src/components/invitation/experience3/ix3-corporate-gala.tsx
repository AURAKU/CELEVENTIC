"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3DateLockup,
  Experience3JourneyNote,
} from "@/components/invitation/experience3/modules/editorial-lockups";
import {
  Experience3AgendaTable,
  Experience3ChipRow,
  Experience3OrnamentRule,
  Experience3PlaceCard,
  Experience3VenuePanel,
} from "@/components/invitation/experience3/modules/feature-strips";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_CORPORATE_GALA } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3CorporateGalaTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const timeLabel = date.time || "Evening";
  const host = props.event.hostName;

  const agenda = [
    { time: timeLabel, item: "Reception & welcome" },
    { time: "Programme", item: props.event.title },
    host ? { time: "Hosted by", item: host } : null,
    props.event.venueName
      ? { time: "Venue", item: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · ") }
      : null,
    props.event.dressCode ? { time: "Attire", item: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ time: string; item: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_CORPORATE_GALA}
      tone="dark"
      composition="gala"
      frameMode="folio"
      headline={props.event.title}
      kicker="Black-tie evening"
      welcomeEyebrow="Guest of honour"
      welcomeLede="Your presence is requested for an evening of recognition."
      hideDefaultMeta
      heroMode="center"
      customHero={
        <div style={{ display: "grid", gap: "0.5rem", justifyItems: "center", textAlign: "center" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(201,162,39,0.92)" }}>
            Black-tie evening
          </p>
          <h1
            className={styles.title}
            style={{
              color: "#f4f7ff",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 500,
              maxWidth: "18ch",
              fontSize: "clamp(1.35rem, 4.5vw, 1.85rem)",
            }}
          >
            {props.event.title}
          </h1>
          <p className={styles.lede} style={{ color: "rgba(154,168,199,0.95)" }}>
            {date.weekday} · {date.day} {date.month} {date.year}
          </p>
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3PlaceCard
          tone="dark"
          guestLabel={props.guestName?.trim() ? props.guestName : "Guest of honour"}
          eventLabel={props.event.title}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3ChipRow
          tone="dark"
          chips={["Black tie", "Recognition", "Reception", "Programme"]}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3OrnamentRule tone="dark" mark="◆" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3AgendaTable rows={agenda} tone="dark" heading="Evening programme" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <section aria-label="Gala briefing">
          <p
            className={styles.note}
            style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            {props.invitation.message ||
              "Recognition, conversation, and refined hospitality—an executive evening with quiet authority."}
          </p>
        </section>
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3VenuePanel
          tone="dark"
          heading="Arrival"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3DateLockup
          tone="dark"
          label="Evening"
          weekday={date.weekday}
          day={date.day}
          month={date.month}
          year={date.year}
          time={date.time}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Doors open in"
          tone="dark"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="dark"
          title="Guest journey"
          body="Review your place card, follow the programme, submit formal guest confirmation, and present your admission QR at arrival."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
