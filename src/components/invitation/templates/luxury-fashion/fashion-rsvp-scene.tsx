"use client";

import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionRsvpScene({
  invitationId,
  guestId,
  guestName,
  partyAllowance,
  initialRsvpStatus,
  initialAttendingCount,
  onStarted,
  onCompleted,
}: {
  invitationId: string;
  guestId?: string;
  guestName?: string;
  partyAllowance?: number;
  initialRsvpStatus?: "ACCEPTED" | "DECLINED" | "MAYBE" | null;
  initialAttendingCount?: number | null;
  onStarted?: () => void;
  onCompleted?: () => void;
}) {
  return (
    <div data-testid="fashion-rsvp" onFocusCapture={onStarted}>
      <p className={styles.kicker}>Request a visit</p>
      <h2 className={styles.heading}>Will you attend</h2>
      <p className={styles.lede}>Attending, maybe, or unable to attend — we will keep your place with care.</p>
      <div style={{ marginTop: "1.25rem" }} onClick={onStarted}>
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
            accepted: "Attending",
            maybe: "Maybe",
            declined: "Unable to attend",
          }}
          onSubmitted={() => onCompleted?.()}
        />
      </div>
    </div>
  );
}
