"use client";

import { useEffect, useRef, useState } from "react";
import { GuestInvitationPortal } from "@/components/guest-portal/guest-invitation-portal";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import { InvitationRevealCeremony } from "@/components/invitation-os/invitation-reveal-ceremony";

interface PremiumInviteWrapperProps extends PremiumInviteExperienceProps {
  revealEnabled?: boolean;
  musicEnabled?: boolean;
  musicUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
}

export function PremiumInviteWrapper({
  revealEnabled = true,
  musicEnabled,
  musicUrl,
  ...props
}: PremiumInviteWrapperProps) {
  const [revealed, setRevealed] = useState(!revealEnabled);
  const tracked = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch("/api/invitation-os/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "INVITE_OPEN",
        invitationId: props.invitation.id,
        guestId: props.guestId,
      }),
    }).catch(() => {});
  }, [props.invitation.id, props.guestId]);

  function handleRevealComplete() {
    setRevealed(true);
    if (musicEnabled && musicUrl?.startsWith("http")) {
      const audio = new Audio(musicUrl);
      audio.volume = 0.35;
      audio.loop = true;
      audio.play().catch(() => {});
      audioRef.current = audio;
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const content = <GuestInvitationPortal {...props} />;

  if (!revealed) {
    return (
      <InvitationRevealCeremony
        guestName={props.guestName}
        eventTitle={props.event.title}
        hostName={props.event.hostName}
        musicEnabled={musicEnabled}
        onRevealComplete={handleRevealComplete}
      >
        {content}
      </InvitationRevealCeremony>
    );
  }

  return content;
}
