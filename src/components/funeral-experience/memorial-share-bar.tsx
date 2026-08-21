"use client";

import { Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import styles from "./funeral-experience.module.css";

export function MemorialShareBar({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      await copyLink();
    } catch {
      /* user cancelled */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`;
  const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;

  return (
    <div className={styles.shareBar} role="group" aria-label="Share memorial">
      <button type="button" className={styles.btnGhost} onClick={nativeShare}>
        <Share2 className="h-4 w-4" aria-hidden />
        Share
      </button>
      <a className={styles.btnGhost} href={wa} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" aria-hidden />
        WhatsApp
      </a>
      <button type="button" className={styles.btnGhost} onClick={copyLink}>
        <Copy className="h-4 w-4" aria-hidden />
        {copied ? "Copied" : "Copy link"}
      </button>
      <a className={styles.btnGhost} href={mail}>
        <Mail className="h-4 w-4" aria-hidden />
        Email
      </a>
    </div>
  );
}
