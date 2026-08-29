"use client";

import { useState } from "react";
import {
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

  async function share() {
    onShare?.();
    const result = await tryNativeInviteShare(payload);
    if (result === "unavailable") {
      const ok = await copyInviteShareLink(payload.url);
      setCopied(ok);
    }
  }

  return (
    <div data-testid="fashion-share">
      <p className={styles.kicker}>Share</p>
      <h2 className={styles.heading}>Pass the invitation</h2>
      <div className={styles.ctaRow}>
        <button
          type="button"
          className={`${styles.cta} ${styles.ctaSolid}`}
          onClick={() => void share()}
          data-testid="fashion-copy-link"
        >
          {copied ? "Link copied" : "Share"}
        </button>
      </div>
    </div>
  );
}
