"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Mail,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { scrollToInvitePage } from "./use-active-page";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import {
  buildInviteShareChannelHref,
  buildInviteSharePayload,
  copyInviteShareLink,
  tryNativeInviteShare,
  type InviteShareChannel,
} from "@/lib/invitation/invite-share";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

interface PersistentActionBarProps {
  context: PageRenderContext;
  /** Appears from page 2 onward, never covers the cinematic cover */
  visible: boolean;
  hasRsvpPage: boolean;
}

const CHANNELS: Array<{
  id: Exclude<InviteShareChannel, "native" | "copy">;
  label: string;
  Icon: typeof MessageCircle;
}> = [
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { id: "sms", label: "Messages", Icon: MessageCircle },
  { id: "telegram", label: "Telegram", Icon: Share2 },
  { id: "facebook", label: "Facebook", Icon: Facebook },
  { id: "x", label: "X", Icon: Share2 },
  { id: "email", label: "Email", Icon: Mail },
];

export function PersistentActionBar({ context, visible, hasRsvpPage }: PersistentActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { invitation, guestId, event, category } = context;

  const payload = useMemo(
    () =>
      buildInviteSharePayload({
        category,
        event,
        uniqueLink: invitation.uniqueLink,
        fallbackHref: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    [category, event, invitation.uniqueLink]
  );

  useEffect(() => {
    if (!sheetOpen) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function track(action: string, channel?: string) {
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action, channel },
    });
  }

  function handleRsvp() {
    track("action_bar_rsvp");
    scrollToInvitePage("rsvp");
  }

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    track("action_bar_share");

    const sharePayload = buildInviteSharePayload({
      category,
      event,
      uniqueLink: invitation.uniqueLink,
      fallbackHref: window.location.href,
    });

    const result = await tryNativeInviteShare(sharePayload);
    setBusy(false);

    if (result === "shared") {
      track("action_bar_share_native", "native");
      return;
    }
    if (result === "cancelled") return;

    // Desktop / restricted webviews — open channel sheet.
    setSheetOpen(true);
  }

  async function handleCopy() {
    const ok = await copyInviteShareLink(payload.url);
    if (!ok) return;
    track("action_bar_share_copy", "copy");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function openChannel(channel: Exclude<InviteShareChannel, "native" | "copy">) {
    track("action_bar_share_channel", channel);
    const href = buildInviteShareChannelHref(channel, payload);
    if (channel === "email" || channel === "sms") {
      window.location.href = href;
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSystemShareFromSheet() {
    const result = await tryNativeInviteShare(payload);
    if (result === "shared") {
      track("action_bar_share_native", "native");
      setSheetOpen(false);
    }
  }

  return (
    <>
      <div className="inv-action-bar inv-paged-chrome" data-visible={visible ? "true" : "false"}>
        {hasRsvpPage && (
          <button type="button" className="inv-btn inv-btn-primary" onClick={handleRsvp}>
            {category === "funeral" ? "Confirm attendance" : "RSVP"}
          </button>
        )}
        <button
          type="button"
          className="inv-btn inv-btn-secondary"
          onClick={() => void handleShare()}
          aria-label="Share invitation"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          disabled={busy}
        >
          {copied ? <Check size={17} aria-hidden /> : <Share2 size={17} aria-hidden />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>

      {sheetOpen ? (
        <div className="inv-share-layer" role="presentation">
          <button
            type="button"
            className="inv-share-backdrop"
            aria-label="Close share options"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="inv-share-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="inv-share-sheet-head">
              <div>
                <p id={titleId} className="inv-share-sheet-title">
                  Share invitation
                </p>
                <p className="inv-share-sheet-sub">Send the link to any app</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="inv-share-sheet-close"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <p className="inv-share-sheet-url" title={payload.url}>
              {payload.url}
            </p>

            <div className="inv-share-grid" role="list">
              {CHANNELS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="inv-share-channel"
                  role="listitem"
                  onClick={() => openChannel(id)}
                >
                  <span className="inv-share-channel-icon" aria-hidden>
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="inv-share-channel-label">{label}</span>
                </button>
              ))}
              <button
                type="button"
                className="inv-share-channel"
                role="listitem"
                onClick={() => void handleCopy()}
              >
                <span className="inv-share-channel-icon" aria-hidden>
                  {copied ? <Check size={18} /> : <Copy size={18} strokeWidth={1.75} />}
                </span>
                <span className="inv-share-channel-label">{copied ? "Copied" : "Copy link"}</span>
              </button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <button
                  type="button"
                  className="inv-share-channel inv-share-channel--accent"
                  role="listitem"
                  onClick={() => void handleSystemShareFromSheet()}
                >
                  <span className="inv-share-channel-icon" aria-hidden>
                    <Share2 size={18} strokeWidth={1.75} />
                  </span>
                  <span className="inv-share-channel-label">More apps</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
