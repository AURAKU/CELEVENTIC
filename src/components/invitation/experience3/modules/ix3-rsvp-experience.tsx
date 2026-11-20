"use client";

import { useEffect, useMemo, useState } from "react";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import {
  readPersistedRsvp,
  type PersistedRsvpChoice,
} from "@/lib/invitation/rsvp-persisted-state";
import styles from "./ix3-rsvp-experience.module.css";

type Family =
  | "heritage"
  | "gala"
  | "shower"
  | "academic"
  | "celebration"
  | "concert"
  | "editorial"
  | "launch"
  | "memorial";

type Ix3RsvpExperienceProps = Pick<
  InvitationRendererProps,
  | "invitation"
  | "guestId"
  | "guestName"
  | "partyAllowance"
  | "initialRsvpStatus"
  | "initialAttendingCount"
> & {
  family: Family;
  tone: "light" | "dark" | "solemn";
  accentColor: string;
  textColor: string;
};

const FAMILY_COPY: Record<
  Family,
  {
    frameLabel: string;
    prompt: string;
    accept: string;
    decline: string;
    maybe: string;
    acceptMark: string;
    declineMark: string;
    maybeMark: string;
    acceptSuccess: string;
    declineSuccess: string;
    maybeSuccess: string;
  }
> = {
  heritage: {
    frameLabel: "Ceremonial reply",
    prompt: "Will you honour this ceremony?",
    accept: "With blessing",
    decline: "With regret",
    maybe: "With hope",
    acceptMark: "Blessing received",
    declineMark: "Regret received",
    maybeMark: "Hope held",
    acceptSuccess: "Your blessing is received — the families give thanks.",
    declineSuccess: "Your note is received with understanding and grace.",
    maybeSuccess: "Thank you — the families hold a seat of hope for you.",
  },
  gala: {
    frameLabel: "Guest confirmation",
    prompt: "Please confirm your attendance",
    accept: "Confirm attendance",
    decline: "Decline with regrets",
    maybe: "Hold tentatively",
    acceptMark: "Attendance confirmed",
    declineMark: "Regrets noted",
    maybeMark: "Tentative hold",
    acceptSuccess: "Attendance confirmed. We look forward to welcoming you.",
    declineSuccess: "Your regrets are noted. Thank you for responding.",
    maybeSuccess: "Tentative hold recorded. Please confirm when you can.",
  },
  shower: {
    frameLabel: "A warm reply",
    prompt: "Will you join our gathering?",
    accept: "I'll be there",
    decline: "I can't make it",
    maybe: "Hoping to join",
    acceptMark: "You're with us",
    declineMark: "We'll miss you",
    maybeMark: "Hope held gently",
    acceptSuccess: "Thank you — we can't wait to celebrate with you.",
    declineSuccess: "Thank you for letting us know. You are in our hearts.",
    maybeSuccess: "Thank you — we hope to see you if you can join.",
  },
  academic: {
    frameLabel: "Recognition reply",
    prompt: "Will you attend commencement?",
    accept: "I will attend",
    decline: "Unable to attend",
    maybe: "Pending",
    acceptMark: "Presence noted",
    declineMark: "Well-wishes noted",
    maybeMark: "Pending confirmation",
    acceptSuccess: "Your presence is noted with pride for this milestone.",
    declineSuccess: "Thank you for responding — your well-wishes are valued.",
    maybeSuccess: "Thank you — please confirm when your plans are clear.",
  },
  celebration: {
    frameLabel: "Celebration RSVP",
    prompt: "Are you in for the night?",
    accept: "Count me in",
    decline: "Can't make it",
    maybe: "Maybe",
    acceptMark: "You're on the list",
    declineMark: "We'll miss you",
    maybeMark: "Maybe noted",
    acceptSuccess: "You're on the list — see you for the celebration.",
    declineSuccess: "Thanks for letting us know. You'll be missed.",
    maybeSuccess: "Got it — save the night if you can.",
  },
  concert: {
    frameLabel: "Admission reply",
    prompt: "Claim your spot",
    accept: "Claim my spot",
    decline: "Release my pass",
    maybe: "Hold my spot",
    acceptMark: "Pass confirmed",
    declineMark: "Pass released",
    maybeMark: "Spot held",
    acceptSuccess: "Pass confirmed — keep your admission QR ready at the door.",
    declineSuccess: "Pass released. Thanks for the update.",
    maybeSuccess: "Spot held tentatively — confirm before doors open.",
  },
  editorial: {
    frameLabel: "Your reply",
    prompt: "Will you join?",
    accept: "Accept",
    decline: "Decline",
    maybe: "Maybe",
    acceptMark: "Confirmed",
    declineMark: "Noted",
    maybeMark: "Received",
    acceptSuccess: "Thank you — your reply is received.",
    declineSuccess: "Thank you — your reply is received.",
    maybeSuccess: "Thank you — your reply is received.",
  },
  launch: {
    frameLabel: "RSVP",
    prompt: "Will you join?",
    accept: "Accept",
    decline: "Decline",
    maybe: "Maybe",
    acceptMark: "Confirmed",
    declineMark: "Noted",
    maybeMark: "Received",
    acceptSuccess: "Thank you — your reply is received.",
    declineSuccess: "Thank you — your reply is received.",
    maybeSuccess: "Thank you — your reply is received.",
  },
  memorial: {
    frameLabel: "Attendance",
    prompt: "Will you attend?",
    accept: "I will be there",
    decline: "Unable to attend",
    maybe: "Uncertain",
    acceptMark: "Presence noted",
    declineMark: "Note received",
    maybeMark: "Care received",
    acceptSuccess: "Thank you — your presence means a great deal.",
    declineSuccess: "Thank you for letting the family know.",
    maybeSuccess: "Thank you — the family appreciates your care.",
  },
};

function ritualClassFor(family: Family): string {
  switch (family) {
    case "heritage":
      return styles.ritualHeritage;
    case "gala":
      return styles.ritualGala;
    case "shower":
      return styles.ritualShower;
    case "academic":
      return styles.ritualAcademic;
    case "celebration":
      return styles.ritualCelebration;
    case "concert":
      return styles.ritualConcert;
    default:
      return styles.ritualDefault;
  }
}

export function Experience3RsvpExperience({
  family,
  tone,
  accentColor,
  textColor,
  invitation,
  guestId,
  guestName,
  partyAllowance,
  initialRsvpStatus,
  initialAttendingCount,
}: Ix3RsvpExperienceProps) {
  const copy = FAMILY_COPY[family] ?? FAMILY_COPY.editorial;
  const [status, setStatus] = useState<PersistedRsvpChoice | null>(
    (initialRsvpStatus as PersistedRsvpChoice | null) ?? null
  );

  // Keep ceremonial confirmation in sync when the shared panel hydrates from sandbox storage.
  useEffect(() => {
    if (status) return;
    const persisted = readPersistedRsvp(invitation.id, guestId);
    if (persisted?.status) setStatus(persisted.status);
  }, [invitation.id, guestId, status]);

  const confirmation = useMemo(() => {
    if (status === "ACCEPTED") {
      return { mark: copy.acceptMark, body: copy.acceptSuccess };
    }
    if (status === "DECLINED") {
      return { mark: copy.declineMark, body: copy.declineSuccess };
    }
    if (status === "MAYBE") {
      return { mark: copy.maybeMark, body: copy.maybeSuccess };
    }
    return null;
  }, [status, copy]);

  return (
    <section
      className={[
        styles.ritual,
        ritualClassFor(family),
        tone === "dark" ? styles.ritualDark : "",
      ].join(" ")}
      aria-label={copy.frameLabel}
      data-testid="ix3-rsvp-ritual"
      data-ix3-rsvp-family={family}
      data-ix3-rsvp-status={status ?? "pending"}
    >
      <header className={styles.ritualHeader}>
        <p className={styles.ritualEyebrow}>{copy.frameLabel}</p>
        <p className={styles.ritualTitle} data-testid="ix3-rsvp-prompt">
          {confirmation ? confirmation.mark : copy.prompt}
        </p>
      </header>

      {confirmation ? (
        <div
          className={styles.confirmation}
          data-testid="ix3-rsvp-confirmation"
          role="status"
          aria-live="polite"
        >
          <p className={styles.confirmationMark}>{confirmation.mark}</p>
          <p className={styles.confirmationBody}>{confirmation.body}</p>
        </div>
      ) : null}

      <InvitationRsvpPanel
        invitationId={invitation.id}
        uniqueLink={invitation.uniqueLink}
        guestId={guestId}
        guestName={guestName}
        partyAllowance={partyAllowance}
        initialRsvpStatus={initialRsvpStatus}
        initialAttendingCount={initialAttendingCount}
        accentColor={accentColor}
        textColor={textColor}
        variant={tone === "dark" ? "dark" : "light"}
        tone={family === "memorial" ? "memorial" : "celebration"}
        label={copy.frameLabel}
        choiceLabels={{
          accepted: copy.accept,
          declined: copy.decline,
          maybe: copy.maybe,
        }}
        successCopy={confirmation?.body}
        onSubmitted={(next) => setStatus(next)}
      />
    </section>
  );
}
