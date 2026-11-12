"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { isLiveReachHref, type DigitalCardReachItem } from "@/lib/digital-business-card/socials";

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/**
 * Open the installed app from a guest tap without replacing the card.
 * Custom schemes (WeChat, LINE, Viber) fire in a hidden frame so a missing app
 * leaves the QR sheet on screen instead of a dead browser page.
 */
export function openInstalledReachApp(item: DigitalCardReachItem, preview?: boolean) {
  if (preview || typeof document === "undefined") return;
  const url = item.appHref;
  if (!url || /^https?:/i.test(url)) return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = url;
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 2500);
}

export function DigitalCardSmartLink({
  item,
  preview,
  className,
  style,
  children,
  onActivate,
  "aria-label": ariaLabel,
}: {
  item: DigitalCardReachItem;
  preview?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onActivate?: () => void;
  "aria-label"?: string;
}) {
  if (!isLiveReachHref(item.href)) return null;

  const phoneOrMail = /^(mailto:|tel:|sms:)/i.test(item.href);
  const website = item.brand === "website";
  const customScheme = !/^(https?:|mailto:|tel:|sms:)/i.test(item.href);
  const openInNewTab = (preview || website) && !customScheme;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    onActivate?.();
    if (preview || phoneOrMail) return;
    if (!item.androidIntent || !isAndroidDevice()) return;
    event.preventDefault();
    window.location.href = item.androidIntent;
  }

  return (
    <a
      href={item.href}
      target={openInNewTab ? "_blank" : undefined}
      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      className={className}
      style={style}
      onClick={onActivate || (item.androidIntent && !preview) ? onClick : undefined}
    >
      {children}
    </a>
  );
}
