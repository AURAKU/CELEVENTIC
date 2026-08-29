"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionLocationActions({
  locationName,
  address,
  mapsUrl,
  copyLabel = "Copy location",
  shareLabel = "Share location",
}: {
  locationName: string;
  address: string;
  mapsUrl: string;
  copyLabel?: string;
  shareLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const href = mapsUrl.trim() || undefined;
  const label = [locationName, address].filter(Boolean).join(", ");

  async function copyAddress() {
    const ok = await copyText(label);
    setCopied(ok);
  }

  async function shareLocation() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: locationName, text: label, url: href });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyAddress();
  }

  if (!label) return null;

  return (
    <div className={styles.ctaRow}>
      <button
        type="button"
        className={styles.cta}
        onClick={() => void copyAddress()}
        data-testid="fashion-copy-location"
      >
        {copied ? "Location copied" : copyLabel}
      </button>
      <button
        type="button"
        className={styles.cta}
        onClick={() => void shareLocation()}
        data-testid="fashion-share-location"
      >
        {shareLabel}
      </button>
    </div>
  );
}
