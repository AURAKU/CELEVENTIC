"use client";

import { signOut } from "next-auth/react";

const WORKSPACE_KEY = "celeventic_workspace";
const LEGAL_ACCEPT_KEY = "celeventic_legal_accepted";

/** Clear client-side session hints then sign out via NextAuth. */
export async function performLogout(callbackUrl = "/") {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(WORKSPACE_KEY);
      localStorage.removeItem(LEGAL_ACCEPT_KEY);
    } catch {
      /* ignore storage errors */
    }
  }

  await signOut({
    callbackUrl,
    redirect: true,
  });
}
