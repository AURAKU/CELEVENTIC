"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VendorEntryLogRow {
  id: string;
  createdAt: string;
  outcome: "ADMITTED" | "DENIED";
  denialReason: string | null;
  quantity: number;
  mode: string;
  entryCycle: number;
  channel: string | null;
  gate: string | null;
  deviceInfo: string | null;
  offline: boolean;
  scannedById: string | null;
  scannedByName: string | null;
}

export interface VendorEntryLogSummary {
  entries: number;
  peopleAdmitted: number;
  deniedAttempts: number;
  currentCycle: number;
  inCurrentCycle: number;
  teamCapacity: number;
  multiEntry: boolean;
  accessLabel: string;
  firstEntryAt: string | null;
  lastEntryAt: string | null;
  truncated: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  qr: "QR scan",
  manual_code: "Typed code",
  dashboard: "Guest CRM",
  offline: "Offline gate",
};

function formatStamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Every scan of a vendor access card — admitted or refused — newest first. */
export function VendorEntryLog({
  passId,
  reloadToken = 0,
  className,
}: {
  passId: string;
  /** Bump to refetch after an admission is recorded elsewhere on the page. */
  reloadToken?: number;
  className?: string;
}) {
  const [rows, setRows] = useState<VendorEntryLogRow[]>([]);
  const [summary, setSummary] = useState<VendorEntryLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vendor-passes/${encodeURIComponent(passId)}/history?limit=100`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not load the entry log");
        return;
      }
      setRows(json.data?.history ?? []);
      setSummary(json.data?.summary ?? null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [passId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-slate-50/70 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900">Entry log</h4>
        <Button type="button" size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {summary && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">{summary.entries} entries</Badge>
          <Badge variant="outline">{summary.peopleAdmitted} people admitted</Badge>
          <Badge variant="outline">
            Cycle {summary.currentCycle} · {summary.inCurrentCycle}/{summary.teamCapacity} inside
          </Badge>
          <Badge variant="outline">{summary.accessLabel}</Badge>
          {summary.deniedAttempts > 0 && (
            <Badge variant="outline" className="border-rose-200 text-rose-700">
              {summary.deniedAttempts} refused
            </Badge>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

      {!error && !rows.length && !loading ? (
        <p className="mt-3 text-sm text-slate-600">
          No entries yet. The first scan at the gate appears here instantly.
        </p>
      ) : null}

      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-3 font-semibold">When</th>
                <th className="py-1.5 pr-3 font-semibold">Status</th>
                <th className="py-1.5 pr-3 font-semibold">People</th>
                <th className="py-1.5 pr-3 font-semibold">Cycle</th>
                <th className="py-1.5 pr-3 font-semibold">Gate</th>
                <th className="py-1.5 pr-3 font-semibold">Scanned by</th>
                <th className="py-1.5 pr-3 font-semibold">Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-2 pr-3 tabular-nums text-slate-700">
                    {formatStamp(row.createdAt)}
                  </td>
                  <td className="py-2 pr-3">
                    {row.outcome === "ADMITTED" ? (
                      <span className="font-semibold text-emerald-700">Admitted</span>
                    ) : (
                      <span className="font-semibold text-rose-700">
                        Refused
                        {row.denialReason ? (
                          <span className="block text-xs font-normal text-rose-600">
                            {row.denialReason}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-slate-700">{row.quantity}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-700">{row.entryCycle}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.gate ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.scannedByName ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-600">
                    {CHANNEL_LABELS[row.channel ?? ""] ?? row.channel ?? "—"}
                    {row.offline ? " · offline" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary?.truncated && (
            <p className="mt-2 text-xs text-slate-500">
              Showing the 100 most recent scans.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
