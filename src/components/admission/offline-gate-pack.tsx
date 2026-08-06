"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudDownload, CloudUpload, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearPackage } from "@/lib/admission/offline-store";
import {
  isPackStale,
  listQueue,
  loadPackage,
  notifyPackChanged,
  packAgeMinutes,
  packCounts,
  downloadGatePack,
  syncGateQueue,
  OFFLINE_PACK_EVENT,
} from "@/lib/admission/offline-gate";
import type { OfflinePackage } from "@/services/admission/offline-admission.service";

/**
 * The single offline gate pack control: download once, admit all night without
 * signal, sync when the network returns. Counts come from the same package the
 * scanner reads, so the card can never claim "0 guests" while the gate works.
 */
export function OfflineGatePack({
  eventId,
  isOnline,
  onResetAll,
  resetting = false,
}: {
  eventId: string;
  isOnline: boolean;
  onResetAll?: () => void;
  resetting?: boolean;
}) {
  const [pkg, setPkg] = useState<OfflinePackage | null>(null);
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState<"download" | "sync" | "clear" | "issue" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [stored, queue] = await Promise.all([loadPackage(eventId), listQueue(eventId)]);
      setPkg(stored);
      setQueued(queue.length);
    } catch {
      /* storage unavailable — the online gate still works */
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ eventId?: string }>).detail;
      if (!detail?.eventId || detail.eventId === eventId) void refresh();
    };
    window.addEventListener(OFFLINE_PACK_EVENT, onChanged);
    return () => window.removeEventListener(OFFLINE_PACK_EVENT, onChanged);
  }, [eventId, refresh]);

  const download = useCallback(async () => {
    setBusy("download");
    setError("");
    setMessage("");
    try {
      const next = await downloadGatePack(eventId);
      const counts = packCounts(next);
      setMessage(
        `Gate pack ready · ${counts.passes} guest passes (${counts.guests} people) · ${counts.vendorCards} vendor access cards · ${counts.codes} gate codes`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the gate pack.");
    } finally {
      setBusy(null);
    }
  }, [eventId, refresh]);

  const sync = useCallback(async () => {
    setBusy("sync");
    setError("");
    setMessage("");
    try {
      const result = await syncGateQueue(eventId);
      setMessage(
        result.applied + result.duplicates + result.conflicts === 0
          ? "Nothing waiting to sync."
          : `Synced ${result.applied} · ${result.duplicates} already recorded · ${result.conflicts} need review${
              result.pending ? ` · ${result.pending} still queued` : ""
            }`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }, [eventId, refresh]);

  // A gate that only downloads when asked is a gate that has nothing the night
  // the signal drops. Fetch once, quietly, the first time an event is picked.
  const prefetched = useRef<string | null>(null);
  useEffect(() => {
    if (!isOnline || busy !== null || prefetched.current === eventId) return;
    let cancelled = false;
    void (async () => {
      const existing = await loadPackage(eventId).catch(() => null);
      if (cancelled || existing) return;
      prefetched.current = eventId;
      try {
        await downloadGatePack(eventId);
        await refresh();
      } catch {
        /* the operator can retry with Download pack; online admission is unaffected */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [busy, eventId, isOnline, refresh]);

  // Gate staff should never have to remember to sync: the moment signal
  // returns, everything captured offline goes up on its own.
  const wasOffline = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOffline.current && queued > 0 && busy === null) {
      void sync();
    }
    wasOffline.current = !isOnline;
  }, [busy, isOnline, queued, sync]);

  /**
   * The usual reason a pack looks empty: invitations exist but no entry pass was
   * ever minted, so there is nothing for a gate to match offline.
   */
  const issuePasses = useCallback(async () => {
    setBusy("issue");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admission/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_event", eventId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error ?? "Could not issue entry passes.");
        return;
      }
      const next = await downloadGatePack(eventId);
      const counts = packCounts(next);
      setMessage(`Entry passes issued. Gate pack now holds ${counts.passes} guest passes.`);
      await refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }, [eventId, refresh]);

  const clear = useCallback(async () => {
    if (queued > 0) {
      setError("Sync the queued admissions before clearing this pack.");
      return;
    }
    setBusy("clear");
    setError("");
    try {
      await clearPackage(eventId);
      notifyPackChanged(eventId);
      setMessage("Offline pack removed from this device.");
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [eventId, queued, refresh]);

  const counts = packCounts(pkg);
  const age = packAgeMinutes(pkg);
  const stale = isPackStale(pkg);
  const missingPasses = pkg?.coverage?.invitationsWithoutPass ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <CloudDownload className="h-4 w-4 shrink-0 text-brand-600" />
            Offline gate pack
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Caches guest entry passes, vendor access cards and their 4/6-digit gate codes on this
            device, so scanning keeps working with no signal.
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {pkg ? (
              <>
                <Badge variant="outline" className="text-[11px]">
                  {counts.passes} guest passes · {counts.guests} people
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {counts.vendorCards} vendor access cards
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {counts.codes} gate codes
                </Badge>
                <Badge variant={stale ? "warning" : "outline"} className="text-[11px]">
                  {stale ? `Stale · cached ${age} min ago` : `Cached ${age} min ago`}
                </Badge>
              </>
            ) : (
              <Badge variant="warning" className="text-[11px]">
                No pack on this device yet
              </Badge>
            )}
            {queued > 0 && (
              <Badge variant="warning" className="text-[11px]">
                {queued} admissions waiting to sync
              </Badge>
            )}
          </div>

          {missingPasses > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span>
                {missingPasses} invitation{missingPasses === 1 ? " has" : "s have"} no entry pass
                yet, so they cannot be admitted offline.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-300 bg-white px-2 text-xs"
                disabled={!isOnline || busy !== null}
                onClick={() => void issuePasses()}
              >
                {busy === "issue" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Issue entry passes
              </Button>
            </div>
          )}

          {message && <p className="mt-1.5 text-xs text-brand-700">{message}</p>}
          {error && <p className="mt-1.5 text-xs text-rose-700">{error}</p>}
          {!isOnline && !pkg && (
            <p className="mt-1.5 text-xs text-rose-700">
              You are offline with no cached pack. Reconnect once to download it.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!isOnline || busy !== null}
            onClick={() => void download()}
          >
            {busy === "download" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudDownload className="h-3.5 w-3.5" />
            )}
            {pkg ? "Refresh pack" : "Download pack"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!isOnline || busy !== null || queued === 0}
            onClick={() => void sync()}
          >
            {busy === "sync" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudUpload className="h-3.5 w-3.5" />
            )}
            Sync {queued > 0 ? `(${queued})` : ""}
          </Button>
          {pkg && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={busy !== null}
              onClick={() => void clear()}
              title={queued > 0 ? "Sync queued admissions first" : undefined}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {onResetAll && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-200 text-amber-800 hover:bg-amber-50"
              disabled={resetting}
              onClick={onResetAll}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset all admissions
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
