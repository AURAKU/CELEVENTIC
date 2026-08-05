"use client";

import { useEffect, useState } from "react";
import { safeSessionStorage } from "@/lib/browser/safe-storage";

/**
 * A chunk that fails to load means the browser is holding asset URLs from a
 * build that no longer exists. On invite routes this is the single most common
 * way a live invitation "breaks" for one guest and works for everyone else:
 * the guest opened the link, the host deployed, and the guest's WhatsApp
 * WebView then resumed a page whose JavaScript is gone. The page is only broken
 * until it re-fetches the current manifest.
 */
const STALE_ASSET_ERROR =
  /ChunkLoadError|Loading chunk \S+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

/** Scoped per pathname so one bad invitation cannot burn another's retry. */
function reloadKey(): string {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return `celeventic:invite-stale-reload:${path}`;
}

function isStaleAssetError(error: Error): boolean {
  return STALE_ASSET_ERROR.test(`${error.name} ${error.message}`);
}

/**
 * Reload once to pick up the current build. Never more than once per session
 * per invitation — a reload loop in front of a wedding invitation is worse than
 * an honest recovery card.
 */
function recoverFromStaleAssets(error: Error): boolean {
  if (!isStaleAssetError(error)) return false;
  const session = safeSessionStorage();
  if (!session) return false;
  const key = reloadKey();
  try {
    if (session.getItem(key)) return false;
    session.setItem(key, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Error boundary for every `/invite/*` route.
 *
 * Invitations are the one surface where a guest has no idea what Celeventic is,
 * no account, and no second route to try — so this boundary is deliberately
 * quieter and warmer than the app-wide one. It never mentions "error",
 * "digest", or the platform's internals unless the guest opens the details, and
 * its first move is always to try to fix itself.
 */
export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    console.error("[invite-route-error]", error);
    setRecovering(recoverFromStaleAssets(error));
  }, [error]);

  // A reload is already in flight; showing a card would only flash.
  if (recovering) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-[100dvh] items-center justify-center bg-[#041A22] px-6 text-center"
      >
        <p className="text-sm tracking-[0.2em] text-[#E8C56A] uppercase">
          Refreshing your invitation…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#041A22] px-6 py-16 text-center">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.42em] text-[#E8C56A]">
        Celeventic
      </p>
      <h1 className="mt-5 max-w-md text-2xl font-semibold text-[#FFFDF9] sm:text-3xl">
        This invitation didn&rsquo;t finish loading
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#FFFDF9]/70">
        Your invitation is still there. This is usually a connection hiccup, so
        trying again is normally all it takes.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[3rem] rounded-full bg-gradient-to-br from-[#F0D489] via-[#D4A63A] to-[#B8892A] px-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#0F172A] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C56A]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[3rem] rounded-full border border-[#FFFDF9]/30 px-8 text-sm font-medium uppercase tracking-[0.18em] text-[#FFFDF9]/85 transition hover:bg-[#FFFDF9]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C56A]"
        >
          Reload page
        </button>
      </div>
      {error.digest ? (
        <p className="mt-10 font-mono text-[10px] tracking-wider text-[#FFFDF9]/35">
          Ref {error.digest}
        </p>
      ) : null}
    </main>
  );
}
