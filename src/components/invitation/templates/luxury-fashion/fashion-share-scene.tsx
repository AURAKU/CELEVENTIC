"use client";

import { useState } from "react";
import {
  buildInviteShareChannelHref,
  buildInviteSharePayload,
  copyInviteShareLink,
  tryNativeInviteShare,
} from "@/lib/invitation/invite-share";
import type { InvitationEventData } from "@/types/invitation-design";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionShareScene({
  event,
  uniqueLink,
  onShare,
}: {
  event: InvitationEventData;
  uniqueLink?: string;
  onShare?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const payload = buildInviteSharePayload({
    category: "wedding",
    event,
    uniqueLink,
  });
  const whatsapp = buildInviteShareChannelHref("whatsapp", payload);

  async function nativeShare() {
    onShare?.();
    const result = await tryNativeInviteShare(payload);
    if (result === "unavailable") await copy();
  }

  async function copy() {
    onShare?.();
    const ok = await copyInviteShareLink(payload.url);
    setCopied(ok);
  }

  return (
    <div data-testid="fashion-share">
      <p className={styles.kicker}>Share</p>
      <h2 className={styles.heading}>Pass the invitation</h2>
      <div className={styles.ctaRow}>
        <button type="button" className={`${styles.cta} ${styles.ctaSolid}`} onClick={() => void nativeShare()}>
          Share
        </button>
        <a className={styles.cta} href={whatsapp} target="_blank" rel="noreferrer" onClick={onShare}>
          WhatsApp
        </a>
        <button type="button" className={styles.cta} onClick={() => void copy()} data-testid="fashion-copy-link">
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
