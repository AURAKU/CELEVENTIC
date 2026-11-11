"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { safeSessionStorage } from "@/lib/browser/safe-storage";
import { inviteLiveRecoveryUrl } from "@/lib/invitation/invite-error-recovery";

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

function liveHandoffKey(): string {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return `celeventic:invite-live-handoff:${path}`;
}

function isStaleAssetError(error: Error): boolean {
  return STALE_ASSET_ERROR.test(`${error.name} ${error.message}`);
}

/**
 * Reload once to pick up the current build. Never more than once per session
 * per invitation. A reload loop in front of a wedding invitation is worse than
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

function beginLiveHandoff(): { url: string; navigating: boolean } | null {
  if (typeof window === "undefined") return null;
  const live = inviteLiveRecoveryUrl({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  });
  if (!live) return null;
  const session = safeSessionStorage();
  const key = liveHandoffKey();
  let already = false;
  try {
    already = Boolean(session?.getItem(key));
    if (!already) session?.setItem(key, "1");
  } catch {
    already = false;
  }
  if (!already) {
    window.location.replace(live);
    return { url: live, navigating: true };
  }
  return { url: live, navigating: false };
}

const shell: CSSProperties = {
  display: "flex",
  minHeight: "100dvh",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#041A22",
  padding: "4rem 1.5rem",
  textAlign: "center",
};

const goldButton: CSSProperties = {
  minHeight: "3rem",
  border: 0,
  borderRadius: 9999,
  background: "linear-gradient(135deg, #F0D489 0%, #D4A63A 52%, #B8892A 100%)",
  padding: "0 2rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#0F172A",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const ghostButton: CSSProperties = {
  ...goldButton,
  background: "transparent",
  border: "1px solid rgba(255, 253, 249, 0.3)",
  color: "rgba(255, 253, 249, 0.85)",
};

/**
 * Error boundary for every `/invite/*` route.
 *
 * Invitations are the one surface where a guest has no idea what Celeventic is,
 * no account, and no second route to try, so this boundary is deliberately
 * quieter and warmer than the app-wide one. It never mentions "error",
 * "digest", or the platform's internals unless the guest opens the details, and
 * its first move is always to try to fix itself.
 *
 * Styles are inline on purpose. When this card appears because CSS chunks
 * failed, Tailwind classes would not paint and guests would only see raw
 * browser buttons.
 */
export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);
  const liveUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return inviteLiveRecoveryUrl({
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  }, []);

  useEffect(() => {
    console.error("[invite-route-error]", error);
    const handoff = beginLiveHandoff();
    if (handoff?.navigating) {
      setRecovering(true);
      const timer = window.setTimeout(() => setRecovering(false), 2500);
      return () => window.clearTimeout(timer);
    }
    setRecovering(recoverFromStaleAssets(error));
  }, [error]);

  if (recovering) {
    return (
      <main aria-busy="true" style={{ ...shell, padding: "1.5rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#E8C56A",
          }}
        >
          {liveUrl ? "Opening your invitation…" : "Refreshing your invitation…"}
        </p>
      </main>
    );
  }

  return (
    <main style={shell}>
      <p
        style={{
          margin: 0,
          fontSize: "0.7rem",
          fontWeight: 500,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: "#E8C56A",
        }}
      >
        Celeventic
      </p>
      <h1
        style={{
          margin: "1.25rem 0 0",
          maxWidth: "28rem",
          fontSize: "1.75rem",
          fontWeight: 600,
          color: "#FFFDF9",
        }}
      >
        This invitation didn&rsquo;t finish loading
      </h1>
      <p
        style={{
          margin: "1rem 0 0",
          maxWidth: "24rem",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "rgba(255, 253, 249, 0.7)",
        }}
      >
        {liveUrl
          ? "Your invitation is still there. Open it on celeventic.com, the same place guests receive the link."
          : "Your invitation is still there. This is usually a connection hiccup, so trying again is normally all it takes."}
      </p>
      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
        }}
      >
        {liveUrl ? (
          <a href={liveUrl} style={goldButton}>
            Open invitation
          </a>
        ) : (
          <button type="button" onClick={() => reset()} style={goldButton}>
            Try again
          </button>
        )}
        <button type="button" onClick={() => window.location.reload()} style={ghostButton}>
          Reload page
        </button>
      </div>
      {error.digest ? (
        <p
          style={{
            margin: "2.5rem 0 0",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "rgba(255, 253, 249, 0.35)",
          }}
        >
          Ref {error.digest}
        </p>
      ) : null}
    </main>
  );
}
