"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import { BRAND_LOGO_ALT, BRAND_LOGO_MARK } from "@/lib/brand/constants";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/** Guest Event Guide help article when this event has no published guide yet. */
const EVENT_GUIDE_FALLBACK_HREF = "/guide/event-guide-guest";

/**
 * Closing attribution + optional growth CTA.
 * Funeral invitations omit the create CTA — a solemn closing should not
 * prompt guests to start their own invite.
 *
 * Brand mark opens the Event Guide (published for this event when available).
 */
export function ViralFooterBlock({ context }: { context: PageRenderContext }) {
  const { templateSlug, invitation, category, eventGuideUrl, design } = context;
  const viralFooterEnabled = design.experience?.viralFooterEnabled;
  const showCreateCta = category !== "funeral" && viralFooterEnabled !== false;
  const guideHref = eventGuideUrl?.trim() || EVENT_GUIDE_FALLBACK_HREF;

  const params = new URLSearchParams({
    utm_source: "invite",
    utm_medium: "viral_footer",
  });
  if (templateSlug) params.set("template", templateSlug);
  if (invitation.uniqueLink) params.set("ref", invitation.uniqueLink);
  const createHref = `/invitations/catalogue?${params.toString()}`;

  function trackCreateClick() {
    trackInviteEvent({
      eventType: "VIRAL_CTA_CLICK",
      invitationId: invitation.id,
      templateSlug,
      metadata: { ref: invitation.uniqueLink, action: "create_invite" },
    });
  }

  function trackGuideClick() {
    trackInviteEvent({
      eventType: "VIRAL_CTA_CLICK",
      invitationId: invitation.id,
      templateSlug,
      metadata: {
        ref: invitation.uniqueLink,
        action: "event_guide",
        href: guideHref,
      },
    });
  }

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ marginTop: "var(--inv-space-block-gap)" }}
    >
      {showCreateCta && (
        <a href={createHref} className="inv-btn inv-btn-primary" onClick={trackCreateClick}>
          <Sparkles size={17} aria-hidden />
          Create your own invitation
        </a>
      )}
      <a
        href={guideHref}
        className="inv-brand-seal"
        onClick={trackGuideClick}
        aria-label={`Powered by Celeventic — open Event Guide`}
        title="Open Event Guide"
      >
        <span className="inv-brand-seal-mark">
          <Image
            src={BRAND_LOGO_MARK}
            alt={BRAND_LOGO_ALT}
            width={112}
            height={112}
            className="inv-brand-seal-img"
            sizes="56px"
          />
        </span>
        <span className="inv-brand-seal-powered">— Powered By CELEVENTIC</span>
      </a>
    </div>
  );
}
