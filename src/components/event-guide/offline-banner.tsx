"use client";

import { formatLastSync } from "@/lib/event-guide/offline-cache";

export type GuideConnection = "online" | "offline" | "stale";

/**
 * The small honesty strip.
 *
 * Offline, a guest is told they are reading a saved copy, when it was saved,
 * and that it may have changed — enough to know whether to trust a start time
 * without turning the guide into a warning banner.
 */
export function OfflineBanner({
  connection,
  syncedAt,
  onRefresh,
}: {
  connection: GuideConnection;
  syncedAt: string | null;
  onRefresh?: () => void;
}) {
  if (connection === "online") return null;

  const offline = connection === "offline";

  return (
    <div
      role="status"
      data-testid="event-guide-offline-banner"
      data-connection={connection}
      className="mx-auto mb-5 flex w-full max-w-xl items-start gap-3 rounded-xl border px-4 py-3 text-left"
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        color: "var(--guide-text)",
      }}
    >
      <span
        aria-hidden
        className="mt-[3px] inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: offline ? "#b4772f" : "var(--guide-accent)" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[0.82rem] font-semibold">
          {offline ? "Offline — showing your saved guide" : "An updated guide is available"}
        </p>
        <p className="mt-0.5 text-[0.76rem] leading-relaxed opacity-75">
          {offline ? (
            <>
              Last updated {formatLastSync(syncedAt)}. Details may have changed since then.
            </>
          ) : (
            <>The hosts have published changes since you opened this page.</>
          )}
        </p>
      </div>
      {!offline && onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
          style={{ background: "var(--guide-accent)", color: "var(--guide-on-accent)" }}
        >
          Refresh
        </button>
      ) : null}
    </div>
  );
}
