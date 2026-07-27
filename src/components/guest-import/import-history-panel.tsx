"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, History, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { ImportPreviewTable } from "./import-preview-table";
import type { ImportBatchView } from "./types";

/**
 * Past imports, with the undo controls.
 *
 * Rollback is offered only while nothing from the batch has been admitted; the
 * server is asked first, so the button an organiser sees is one that will
 * actually work. Once somebody has walked through the gate, archive takes over
 * — it revokes the passes and hides the invitations without erasing the
 * admission record.
 */

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  READY: "bg-blue-50 text-blue-700",
  GENERATING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
  ROLLED_BACK: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function ImportHistoryPanel({ eventId }: { eventId: string }) {
  const [batches, setBatches] = useState<ImportBatchView[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [safety, setSafety] = useState<Record<string, { canRollback: boolean; reason: string | null }>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/guest-import/batches?eventId=${eventId}&page=${page}&limit=20`);
    const data = await res.json();
    if (res.ok) {
      setBatches(data.data.items ?? []);
      setPages(data.data.pages ?? 1);
      setTotal(data.data.total ?? 0);
    }
  }, [eventId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkSafety = useCallback(async (batchId: string) => {
    const res = await fetch(`/api/guest-import/batches/${batchId}/lifecycle`);
    const data = await res.json();
    if (res.ok) {
      setSafety((prev) => ({
        ...prev,
        [batchId]: { canRollback: data.data.canRollback, reason: data.data.reason },
      }));
    }
  }, []);

  async function act(batchId: string, action: "rollback" | "archive" | "restore") {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/guest-import/batches/${batchId}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: "Organiser requested from import history" }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(data.error ?? "That did not work.");
      if (data.suggestArchive) {
        setSafety((prev) => ({ ...prev, [batchId]: { canRollback: false, reason: data.error } }));
      }
      return;
    }

    setMessage(
      action === "rollback"
        ? `Rolled back — removed ${data.data.invitationsRemoved} invitation${data.data.invitationsRemoved === 1 ? "" : "s"}.`
        : action === "archive"
          ? `Archived — revoked ${data.data.passesRevoked} pass${data.data.passesRevoked === 1 ? "" : "es"}.`
          : `Restored ${data.data.invitationsRestored} invitation${data.data.invitationsRestored === 1 ? "" : "s"}.`
    );
    await load();
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          No imports yet. Your first bulk import will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Import history ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="font-medium">
                    {batch.label || batch.fileName || `${batch.source.replace("_", " ").toLowerCase()} import`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(batch.createdAt).toLocaleString()} · {batch.generatedRows} created
                    {batch.failedRows > 0 ? ` · ${batch.failedRows} failed` : ""}
                    {batch.skippedRows > 0 ? ` · ${batch.skippedRows} skipped` : ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLES[batch.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {batch.status.replace("_", " ").toLowerCase()}
                </span>

                <div className="ml-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = expanded === batch.id ? null : batch.id;
                      setExpanded(next);
                      if (next) void checkSafety(batch.id);
                    }}
                  >
                    {expanded === batch.id ? "Hide rows" : "View rows"}
                  </Button>

                  {batch.status === "ROLLED_BACK" ? null : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || safety[batch.id]?.canRollback === false}
                        onClick={() => act(batch.id, "rollback")}
                        title={safety[batch.id]?.reason ?? "Remove everything this import created"}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        Roll back
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(batch.id, "archive")}>
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(batch.id, "restore")}>
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {safety[batch.id]?.reason && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  {safety[batch.id].reason}
                </p>
              )}

              {expanded === batch.id && (
                <div className="mt-3">
                  <ImportPreviewTable batchId={batch.id} editable={batch.status === "DRAFT"} />
                </div>
              )}
            </div>
          ))}

          <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
