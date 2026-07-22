"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { scrollToInvitePage } from "./use-active-page";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

interface PersistentActionBarProps {
  context: PageRenderContext;
  /** Appears from page 2 onward — never covers the cinematic cover */
  visible: boolean;
  hasRsvpPage: boolean;
}

export function PersistentActionBar({ context, visible, hasRsvpPage }: PersistentActionBarProps) {
  const [copied, setCopied] = useState(false);
  const { invitation, guestId, event } = context;

  function handleRsvp() {
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action: "action_bar_rsvp" },
    });
    scrollToInvitePage("rsvp");
  }

  async function handleShare() {
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action: "action_bar_share" },
    });
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }
    } catch {
      // user dismissed the share sheet — fall through silently
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable in this webview — nothing further to do
    }
  }

  return (
    <div className="inv-action-bar inv-paged-chrome" data-visible={visible ? "true" : "false"}>
      {hasRsvpPage && (
        <button type="button" className="inv-btn inv-btn-primary" onClick={handleRsvp}>
          RSVP
        </button>
      )}
      <button type="button" className="inv-btn inv-btn-secondary" onClick={handleShare} aria-label="Share invitation">
        {copied ? <Check size={17} aria-hidden /> : <Share2 size={17} aria-hidden />}
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
