"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import {
  isLiveReachHref,
  reachLaunchPlan,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function isMobileGuestDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1) return true;
  return false;
}

function tryNativeAppThenWeb(native: string, web: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  let leftForApp = false;
  const started = Date.now();
  function onVisibility() {
    if (document.hidden) leftForApp = true;
  }
  document.addEventListener("visibilitychange", onVisibility);
  window.location.assign(native);
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (leftForApp || document.hidden) return;
    if (Date.now() - started > 2500) return;
    if (!web || web === native) return;
    window.location.assign(web);
  }, 900);
}

/**
 * Open the installed app from a guest tap without replacing the card.
 * Custom schemes (WeChat, LINE, Viber) fire in a hidden frame so a missing app
 * leaves the QR sheet on screen instead of a dead browser page.
 */
export function openInstalledReachApp(item: DigitalCardReachItem, preview?: boolean) {
  if (preview || typeof document === "undefined" || typeof window === "undefined") return;
  const plan = reachLaunchPlan(item, {
    android: isAndroidDevice(),
    mobile: isMobileGuestDevice(),
  });
  if (plan.mode === "intent" && plan.native) {
    window.location.assign(plan.native);
    return;
  }
  if (plan.mode === "native-then-web" && plan.native) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = plan.native;
    iframe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 2500);
  }
}

/** Guest tap: enter the installed app when it exists, otherwise the web page. */
export function launchGuestReach(item: DigitalCardReachItem, preview?: boolean): boolean {
  if (preview || typeof window === "undefined") return false;
  const plan = reachLaunchPlan(item, {
    android: isAndroidDevice(),
    mobile: isMobileGuestDevice(),
  });
  if (plan.mode === "intent" && plan.native) {
    window.location.assign(plan.native);
    return true;
  }
  if (plan.mode === "native-then-web" && plan.native) {
    tryNativeAppThenWeb(plan.native, plan.web);
    return true;
  }
  return false;
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
    if (launchGuestReach(item, preview)) {
      event.preventDefault();
    }
  }

  return (
    <a
      href={item.href}
      target={openInNewTab ? "_blank" : undefined}
      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
