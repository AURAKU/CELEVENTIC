"use client";

import { useEffect, useState } from "react";
import { formatFashionVenueLine } from "@/lib/experience/luxury-fashion";
import { copyText } from "@/lib/clipboard";
import { resolveMapsLocationHref } from "@/lib/invitation/maps-utils";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionLocationActions({
  locationName,
  address,
  mapsUrl,
  shareLabel = "Share location",
}: {
  locationName: string;
  address: string;
  mapsUrl: string;
  shareLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const href = resolveMapsLocationHref({ mapsUrl, locationName, address }) || undefined;
  const label = formatFashionVenueLine(locationName, address);
  const copyValue = [label, href].filter(Boolean).join("\n");

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyAddress() {
    const ok = await copyText(copyValue);
    setCopied(ok);
  }

  async function shareLocation() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: locationName || "Location",
          text: label,
          url: href,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyAddress();
  }

  if (!label && !href) return null;

  return (
    <div className={styles.ctaRow}>
      <button
        type="button"
        className={styles.cta}
        onClick={() => void shareLocation()}
        data-testid="fashion-share-location"
      >
        {copied ? "Location copied" : shareLabel}
      </button>
    </div>
  );
}
