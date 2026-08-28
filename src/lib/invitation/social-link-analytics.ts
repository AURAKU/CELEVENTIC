import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { InvitationSocialPlatformId } from "./social-links";

export type SocialLinkClickLocation = "social-page" | "finale";

/** Generic non-PII social click on the existing INVITE_ACTION_CLICK pipeline. */
export function trackSocialLinkClick(input: {
  invitationId?: string;
  templateSlug?: string;
  platform: InvitationSocialPlatformId;
  location: SocialLinkClickLocation;
}): void {
  trackInviteEvent(
    {
      eventType: "INVITE_ACTION_CLICK",
      invitationId: input.invitationId,
      templateSlug: input.templateSlug,
      metadata: {
        action: "SOCIAL_LINK_CLICK",
        platform: input.platform,
        location: input.location,
      },
    },
    `social:${input.platform}:${input.location}:${input.invitationId ?? "anon"}`
  );
}
