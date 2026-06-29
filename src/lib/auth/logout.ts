"use client";

import { signOut } from "next-auth/react";
import { getClientAppUrl, isLocalHost } from "@/lib/app-url";

const WORKSPACE_KEY = "celeventic_workspace";
const LEGAL_ACCEPT_KEY = "celeventic_legal_accepted";

/** Build a same-origin callback URL — never localhost when on a live Celeventic domain. */
export function resolveLogoutCallbackUrl(callbackPath = "/"): string {
  if (typeof window === "undefined") return callbackPath;

  if (callbackPath.startsWith("http://") || callbackPath.startsWith("https://")) {
    if (!isLocalHost(callbackPath)) return callbackPath;
    try {
      const parsed = new URL(callbackPath);
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return window.location.origin;
    }
  }

  const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return `${window.location.origin}${path}`;
}

/** Clear client-side session hints then sign out — always land on the current live domain. */
export async function performLogout(callbackPath = "/") {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(WORKSPACE_KEY);
      localStorage.removeItem(LEGAL_ACCEPT_KEY);
    } catch {
      /* ignore storage errors */
    }
  }

  const callbackUrl = resolveLogoutCallbackUrl(callbackPath);

  await signOut({ redirect: false });

  if (typeof window !== "undefined") {
    window.location.assign(callbackUrl);
  }
}

/** OAuth / login callbacks should use the current browser origin on live hosts. */
export function resolveAuthCallbackUrl(path = "/dashboard"): string {
  if (typeof window !== "undefined" && !isLocalHost(window.location.origin)) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${window.location.origin}${normalized}`;
  }
  const base = getClientAppUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
