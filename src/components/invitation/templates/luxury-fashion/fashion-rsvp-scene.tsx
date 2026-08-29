"use client";

import { useState } from "react";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionRsvpScene({
  invitationId,
  guestId,
  guestName,
  partyAllowance,
  initialRsvpStatus,
  initialAttendingCount,
  heading,
  acceptedLabel,
  lede,
  visitDayOptions,
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
  lede?: string;
  visitDayOptions?: { id: string; label: string }[];
  onStarted?: () => void;
  onCompleted?: () => void;
}) {
  const days = visitDayOptions?.filter((day) => day.id && day.label) ?? [];
  const [visitDay, setVisitDay] = useState<string | null>(null);

  return (
    <div data-testid="fashion-rsvp" onFocusCapture={onStarted}>
      <p className={styles.kicker}>Your reply</p>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.lede}>
        {lede?.trim() || "Yes, maybe, or unable to attend, we will keep your place with care."}
      </p>
      {days.length ? (
        <fieldset className={styles.visitField} data-testid="fashion-visit-day">
          <legend>Preferred visit date</legend>
          <div className={styles.visitRow} role="radiogroup" aria-label="Preferred visit date">
            {days.map((day) => (
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
      ) : null}
      <div className={styles.rsvpWrap} onClick={onStarted}>
        <InvitationRsvpPanel
          invitationId={invitationId}
          guestId={guestId}
          guestName={guestName}
          partyAllowance={partyAllowance}
          initialRsvpStatus={initialRsvpStatus}
          initialAttendingCount={initialAttendingCount}
          variant="fashion"
          showEmail={false}
          showPhone={false}
          accentColor="#9A7A48"
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
