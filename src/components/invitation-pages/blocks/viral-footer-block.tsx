"use client";

import { Sparkles } from "lucide-react";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/**
 * The growth engine: every invitation ends with a conversion surface.
 * The CTA pre-selects the template the guest just experienced and carries
 * referral attribution back to the catalogue → create funnel.
 */
export function ViralFooterBlock({ context }: { context: PageRenderContext }) {
  const { templateSlug, invitation } = context;

  const params = new URLSearchParams({
    utm_source: "invite",
    utm_medium: "viral_footer",
  });
  if (templateSlug) params.set("template", templateSlug);
  if (invitation.uniqueLink) params.set("ref", invitation.uniqueLink);
  const href = `/invitations/catalogue?${params.toString()}`;

  function handleClick() {
    // sendBeacon-backed — survives the navigation.
    trackInviteEvent({
      eventType: "VIRAL_CTA_CLICK",
      invitationId: invitation.id,
      templateSlug,
      metadata: { ref: invitation.uniqueLink },
    });
  }

  return (
    <div className="flex flex-col items-center gap-2" style={{ marginTop: "var(--inv-space-block-gap)" }}>
      <a href={href} className="inv-btn inv-btn-primary" onClick={handleClick}>
        <Sparkles size={17} aria-hidden />
        Create your own invitation
      </a>
      <p className="inv-eyebrow">Made with Celeventic</p>
    </div>
  );
}
