"use client";

import { useState } from "react";
import { InvitationRevealCeremony } from "@/components/invitation-os/invitation-reveal-ceremony";
import { ScratchReveal } from "@/components/invitation-os/reveal/scratch-reveal";
import { PassportReveal } from "@/components/invitation-os/reveal/passport-reveal";
import { GlassReveal } from "@/components/invitation-os/reveal/glass-reveal";
import { CurtainReveal } from "@/components/invitation-os/reveal/curtain-reveal";
import { ScrollUnrollReveal } from "@/components/invitation-os/reveal/scroll-unroll-reveal";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";

interface InvitationRevealRouterProps {
  mode: RevealMode;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  onRevealComplete: () => void;
  children: React.ReactNode;
}

export function InvitationRevealRouter({
  mode,
  guestName,
  eventTitle,
  hostName,
  musicEnabled,
  onRevealComplete,
  children,
}: InvitationRevealRouterProps) {
  const [revealed, setRevealed] = useState(false);

  function complete() {
    setRevealed(true);
    onRevealComplete();
  }

  if (mode === "none" || revealed) return <div className="inv-portal-enter">{children}</div>;

  switch (mode) {
    case "scratch":
      return <ScratchReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "passport":
      return (
        <PassportReveal guestName={guestName} eventTitle={eventTitle} hostName={hostName} onComplete={complete} />
      );
    case "glass":
      return <GlassReveal guestName={guestName} eventTitle={eventTitle} onComplete={complete} />;
    case "curtain":
      return <CurtainReveal eventTitle={eventTitle} onComplete={complete} />;
    case "scroll-unroll":
      return (
        <ScrollUnrollReveal
          guestName={guestName}
          eventTitle={eventTitle}
          hostName={hostName}
          onComplete={complete}
        />
      );
    case "envelope":
    default:
      return (
        <InvitationRevealCeremony
          guestName={guestName}
          eventTitle={eventTitle}
          hostName={hostName}
          musicEnabled={musicEnabled}
          onRevealComplete={complete}
        >
          {children}
        </InvitationRevealCeremony>
      );
  }
}
