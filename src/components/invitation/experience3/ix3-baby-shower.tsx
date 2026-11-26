"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { Experience3EssentialsTimeline } from "@/components/invitation/experience3/modules/essentials-timeline";
import { Experience3EventCountdown } from "@/components/invitation/experience3/modules/event-countdown";
import {
  Experience3DateLockup,
  Experience3JourneyNote,
} from "@/components/invitation/experience3/modules/editorial-lockups";
import { Experience3VenuePanel } from "@/components/invitation/experience3/modules/feature-strips";
import {
  Experience3AnticipationRibbon,
  Experience3GiftWhisper,
  Experience3ShowerStory,
} from "@/components/invitation/experience3/modules/shower-moments";
import { Experience3SectionReveal } from "@/components/invitation/experience3/modules/section-reveal";
import { IX3_BABY_SHOWER } from "@/lib/invitation/studio3/expanded-definitions";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import styles from "./experience3-shell.module.css";

export function Ix3BabyShowerTemplate(props: InvitationRendererProps) {
  const date = formatInvitationDateParts(props.event.startDateRaw ?? props.event.startDate);
  const hosts = props.event.hostName || "the family";
  const title = props.event.title;
  const giftDetail =
    typeof (props.event as { giftNote?: string }).giftNote === "string"
      ? (props.event as { giftNote?: string }).giftNote
      : props.invitation.message?.toLowerCase().includes("gift")
        ? props.invitation.message
        : null;

  const beats = [
    {
      label: "Arrive & settle",
      detail: `${date.weekday}, ${date.day} ${date.month} ${date.year}${date.time ? ` · ${date.time}` : ""}`,
    },
    props.event.venueName || props.event.landmark
      ? {
          label: "Gathering place",
          detail: [props.event.venueName, props.event.landmark].filter(Boolean).join(" · "),
        }
      : null,
    props.event.dressCode ? { label: "Comfortable elegance", detail: props.event.dressCode } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BABY_SHOWER}
      tone="light"
      composition="shower"
      frameMode="card"
      headline={title}
      kicker="A soft gathering"
      welcomeEyebrow="With warm hearts"
      welcomeLede={`You are gently invited by ${hosts}.`}
      hideDefaultMeta
      heroMode="stacked"
      customHero={
        <div style={{ display: "grid", gap: "0.55rem", color: "#fffaf6", textAlign: "left" }}>
          <p className={styles.eyebrow} style={{ color: "rgba(255,250,246,0.86)" }}>
            A soft gathering
          </p>
          <h1
            className={styles.title}
            style={{
              color: "#fffaf6",
              fontStyle: "italic",
              fontWeight: 400,
              letterSpacing: "0.01em",
              maxWidth: "16ch",
            }}
          >
            {title}
          </h1>
          <p className={styles.lede} style={{ color: "rgba(255,250,246,0.88)", maxWidth: "28ch" }}>
            Warmth, anticipation, and a quiet celebration for the little one on the way.
          </p>
        </div>
      }
    >
      <Experience3SectionReveal>
        <Experience3ShowerStory
          tone="light"
          eyebrow="Our story"
          title="Something tender is beginning"
          body={
            props.invitation.message ||
            "We are gathering close friends and family to celebrate this chapter—soft laughter, gentle company, and room to share in the joy ahead."
          }
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={1}>
        <Experience3AnticipationRibbon tone="light" line="Warmth · Anticipation · New beginnings" />
      </Experience3SectionReveal>
      {giftDetail ? (
        <Experience3SectionReveal delay={1}>
          <Experience3GiftWhisper tone="light" detail={giftDetail} />
        </Experience3SectionReveal>
      ) : (
        <Experience3SectionReveal delay={1}>
          <Experience3GiftWhisper
            tone="light"
            detail="Your presence is the gift—optional keepsakes are welcome if you wish."
          />
        </Experience3SectionReveal>
      )}
      <Experience3SectionReveal delay={2}>
        <Experience3VenuePanel
          tone="light"
          heading="Where we gather"
          venue={props.event.venueName}
          landmark={props.event.landmark}
          dressCode={props.event.dressCode}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={2}>
        <Experience3DateLockup
          tone="light"
          label="We gather"
          weekday={date.weekday}
          day={date.day}
          month={date.month}
          year={date.year}
          time={date.time}
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EssentialsTimeline beats={beats} heading="Afternoon flow" tone="light" />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3EventCountdown
          startAtIso={props.event.startDateRaw}
          label="Until we gather"
          tone="light"
        />
      </Experience3SectionReveal>
      <Experience3SectionReveal delay={3}>
        <Experience3JourneyNote
          tone="light"
          title="Your gentle path"
          body="Open with care, linger on the story, note the gathering details, send a warm reply, and keep your admission QR if the hosts request it."
        />
      </Experience3SectionReveal>
    </Experience3Shell>
  );
}
