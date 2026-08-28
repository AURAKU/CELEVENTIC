"use client";

import { useState } from "react";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import styles from "./luxury-fashion-flagship.module.css";

const VISIT_DAYS = [
  { id: "29", label: "29 August" },
  { id: "30", label: "30 August" },
  { id: "BOTH", label: "Both" },
] as const;

export function FashionRsvpScene({
  invitationId,
  guestId,
  guestName,
  partyAllowance,
  initialRsvpStatus,
  initialAttendingCount,
  heading,
  acceptedLabel,
  onStarted,
  onCompleted,
}: {
  invitationId: string;
  guestId?: string;
  guestName?: string;
  partyAllowance?: number;
  initialRsvpStatus?: "ACCEPTED" | "DECLINED" | "MAYBE" | null;
  initialAttendingCount?: number | null;
  heading: string;
  acceptedLabel: string;
  onStarted?: () => void;
  onCompleted?: () => void;
}) {
  const [visitDay, setVisitDay] = useState<(typeof VISIT_DAYS)[number]["id"] | null>(null);

  return (
    <div data-testid="fashion-rsvp" onFocusCapture={onStarted}>
      <p className={styles.kicker}>Your reply</p>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.lede}>Yes, maybe, or unable to attend — we will keep your place with care.</p>
      <fieldset className={styles.visitField} data-testid="fashion-visit-day">
        <legend>Preferred visit date</legend>
        <div className={styles.visitRow} role="radiogroup" aria-label="Preferred visit date">
          {VISIT_DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              role="radio"
              aria-checked={visitDay === day.id}
              className={`${styles.cta} ${visitDay === day.id ? styles.ctaSolid : ""}`}
              onClick={() => {
                onStarted?.();
                setVisitDay(day.id);
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className={styles.rsvpWrap} onClick={onStarted}>
        <InvitationRsvpPanel
          invitationId={invitationId}
          guestId={guestId}
          guestName={guestName}
          partyAllowance={partyAllowance}
          initialRsvpStatus={initialRsvpStatus}
          initialAttendingCount={initialAttendingCount}
          variant="light"
          accentColor="#9A7A48"
          label="Your reply"
          choiceLabels={{
            accepted: acceptedLabel,
            maybe: "Maybe",
            declined: "Unable to attend",
          }}
          guestMessage={visitDay ? `VISIT_DAY:${visitDay}` : undefined}
          successCopy="We look forward to welcoming you."
          onSubmitted={() => onCompleted?.()}
        />
      </div>
    </div>
  );
}
