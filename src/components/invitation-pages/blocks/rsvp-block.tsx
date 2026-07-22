"use client";

import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { isDarkColor } from "@/lib/invitation-theme/color-utils";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/**
 * Token-styled wrapper around the existing RSVP panel → POST /api/rsvp.
 * Preview invitations short-circuit inside the panel (isPreviewInvitationId).
 */
export function RsvpBlock({ context }: { context: PageRenderContext }) {
  const { theme, invitation, guestId, guestName, design } = context;
  const variant = isDarkColor(theme.color.surface) ? "dark" : "light";

  return (
    <div className="w-full max-w-sm mx-auto text-left">
      <InvitationRsvpPanel
        invitationId={invitation.id}
        guestId={guestId}
        guestName={guestName}
        accentColor={theme.color.accent}
        variant={variant}
        buttonStyle={design.studio?.buttonStyle}
      />
    </div>
  );
}
