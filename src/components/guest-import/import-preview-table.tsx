"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Info, Loader2, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { requestJson } from "./request";
import { PARTY_TYPE_LABELS, STATUS_LABELS, type ImportRowView } from "./types";

/**
 * The review table.
 *
 * Everything an organiser needs to answer "is this list right?" before a
 * single invitation exists: per-row status, why a row was flagged, inline
 * correction of the name and allowance, and an explicit create/skip decision
 * for every duplicate. Paginated server-side, a 5,000-row import is browsed,
 * never loaded whole.
 */

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

interface PaginatedRows {
  items: ImportRowView[];
  pages: number;
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  DUPLICATE: "bg-orange-50 text-orange-700 border-orange-200",
  INVALID: "bg-red-50 text-red-700 border-red-200",
  SKIPPED: "bg-slate-100 text-slate-500 border-slate-200",
  GENERATED: "bg-brand-50 text-brand-700 border-brand-200",
  GENERATING: "bg-blue-50 text-blue-700 border-blue-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "READY", label: "Ready" },
  { key: "NEEDS_REVIEW", label: "Needs review" },
  { key: "DUPLICATE", label: "Duplicates" },
  { key: "INVALID", label: "Cannot import" },
  { key: "SKIPPED", label: "Skipped" },
] as const;

interface Props {
  batchId: string;
  editable: boolean;
  onChanged?: () => void;
  /** Bump to force a reload (e.g. while generation progress updates). */
  refreshKey?: number | string;
  /**
   * Duplicates awaiting a decision across the whole batch, not just this page.
   * Confirmation is blocked by all of them, so the bulk controls have to be
   * reachable from page one of a fifty-page import.
   */
  duplicatesInBatch?: number;
}

export function ImportPreviewTable({
  batchId,
  editable,
  onChanged,
  refreshKey,
  duplicatesInBatch,
}: Props) {
  const [rows, setRows] = useState<ImportRowView[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // One request when the organiser stops typing, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset before the fetch, so changing a filter cannot request page 9 of a
  // list that now has two pages and render "no rows match".
  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filter !== "all") params.set("status", filter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    const result = await requestJson<PaginatedRows>(
      `/api/guest-import/batches/${batchId}/rows?${params}`
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setRows(result.data.items ?? []);
    setPages(result.data.pages ?? 1);
    setTotal(result.data.total ?? 0);
  }, [batchId, page, filter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const patchRow = useCallback(
    async (rowId: string, patch: Partial<ImportRowView>) => {
      setBusy(true);
      const result = await requestJson(`/api/guest-import/batches/${batchId}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ rowId, ...patch }] }),
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
      onChanged?.();
    },
    [batchId, load, onChanged]
  );

  const bulk = useCallback(
    async (decision: "CREATE" | "SKIP", status?: string) => {
      setBusy(true);
      const result = await requestJson(`/api/guest-import/batches/${batchId}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, status }),
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
      onChanged?.();
    },
    [batchId, load, onChanged]
  );

  const duplicatesPending = useMemo(
    () => duplicatesInBatch ?? rows.filter((r) => r.status === "DUPLICATE").length,
    [duplicatesInBatch, rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-56">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names…"
            aria-label="Search guest names"
          />
        </div>
      </div>

      {editable && duplicatesPending > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {duplicatesPending} possible duplicate{duplicatesPending === 1 ? "" : "s"} need
              {duplicatesPending === 1 ? "s" : ""} a decision before you can create invitations.
              Nothing is merged automatically.
            </span>
          </span>
          <div className="flex gap-2 sm:ml-auto">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("SKIP", "DUPLICATE")}>
              Skip all duplicates
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk("CREATE", "DUPLICATE")}>
              Create all anyway
            </Button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Admits</th>
              <th className="px-3 py-2 font-medium">Seat</th>
              <th className="px-3 py-2 font-medium">Status</th>
              {editable && <th className="px-3 py-2 font-medium">Decision</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={editable ? 8 : 7} className="px-3 py-8 text-center text-slate-500">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading the preview…
                    </span>
                  ) : filter === "all" && !debouncedSearch ? (
                    "This import has no rows."
                  ) : (
                    "No rows match this filter."
                  )}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className={row.decision === "SKIP" ? "bg-slate-50/70 text-slate-400" : undefined}
              >
                <td className="px-3 py-2 text-xs text-slate-400">{row.rowIndex + 1}</td>
                <td className="px-3 py-2">
                  {editable ? (
                    <EditableCell
                      value={row.name}
                      onSave={(value) => patchRow(row.id, { name: value })}
                      ariaLabel={`Name for row ${row.rowIndex + 1}`}
                    />
                  ) : (
                    <span className="font-medium">{row.name}</span>
                  )}
                  <RowIssues row={row} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.email || row.phone ? (
                    <div className="space-y-0.5">
                      {row.email && <p>{row.email}</p>}
                      {row.phone && <p>{row.phone}</p>}
                    </div>
                  ) : (
                    <span className="italic text-slate-400">Name only</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{PARTY_TYPE_LABELS[row.partyType] ?? row.partyType}</td>
                <td className="px-3 py-2">
                  {editable ? (
                    <EditableCell
                      value={String(row.partySize)}
                      numeric
                      onSave={(value) => patchRow(row.id, { partySize: Number(value) || 1 })}
                      ariaLabel={`Party allowance for ${row.name}`}
                    />
                  ) : (
                    row.partySize
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.tableNumber
                    ? `${row.tableNumber}${row.seatLabel ? ` · ${row.seatLabel}` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[row.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                  {row.error && <p className="mt-1 text-[11px] text-red-600">{row.error}</p>}
                </td>
                {editable && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={row.decision === "CREATE" ? "default" : "outline"}
                        disabled={busy || row.status === "INVALID"}
                        onClick={() => patchRow(row.id, { decision: "CREATE" })}
                        aria-label={`Create invitation for ${row.name}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={row.decision === "SKIP" ? "default" : "outline"}
                        disabled={busy}
                        onClick={() => patchRow(row.id, { decision: "SKIP" })}
                        aria-label={`Skip ${row.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      {row.duplicateOfRowIndex == null && row.status === "DUPLICATE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => patchRow(row.id, { decision: "UPDATE_EXISTING" })}
                          aria-label={`Update the existing guest instead of creating ${row.name}`}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={page}
        pages={pages}
        total={total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}

function RowIssues({ row }: { row: ImportRowView }) {
  if (!row.issues?.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {row.issues.slice(0, 3).map((issue, i) => (
        <li
          key={`${issue.code}-${i}`}
          className={`flex items-start gap-1 text-[11px] ${
            issue.severity === "error"
              ? "text-red-600"
              : issue.severity === "warning"
                ? "text-amber-700"
                : "text-slate-500"
          }`}
        >
          {issue.severity === "info" ? (
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
          ) : issue.code.startsWith("DUPLICATE") ? (
            <Copy className="mt-0.5 h-3 w-3 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          )}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

function EditableCell({
  value,
  onSave,
  numeric,
  ariaLabel,
}: {
  value: string;
  onSave: (value: string) => void;
  numeric?: boolean;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded px-1 text-left font-medium hover:bg-slate-100"
        aria-label={`Edit ${ariaLabel}`}
      >
        {value || <span className="italic text-slate-400">Add</span>}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <Input
      autoFocus
      value={draft}
      aria-label={ariaLabel}
      type={numeric ? "number" : "text"}
      min={numeric ? 1 : undefined}
      className={numeric ? "h-8 w-20" : "h-8"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}
