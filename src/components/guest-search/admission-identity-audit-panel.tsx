"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import {
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import type { AdmissionIdentityAuditRow } from "@/lib/admission-identity/types";
import type { AuditIssueFilter } from "@/lib/admission-identity/classify";
import { formatAdmissionCode } from "@/lib/admission/pass-code";

type AuditResponse = {
  items: AdmissionIdentityAuditRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  summary: {
    totalInvitations: number;
    incomplete: number;
    missingQr: number;
    missingCode: number;
    complete: number;
    revoked: number;
    duplicateCode: number;
  };
  truncated?: boolean;
};

type DuplicatePair = {
  left: AdmissionIdentityAuditRow;
  right: AdmissionIdentityAuditRow;
  confidence: "strong" | "possible";
  reasons: string[];
};

const ISSUE_FILTERS: { key: AuditIssueFilter; label: string }[] = [
  { key: "all_incomplete", label: "Incomplete" },
  { key: "missing_qr", label: "Missing QR" },
  { key: "missing_code", label: "Missing Code" },
  { key: "missing_link", label: "Missing Link" },
  { key: "missing_both_qr_code", label: "Missing QR & Code" },
  { key: "invalid_code", label: "Invalid Code" },
  { key: "duplicate_code", label: "Duplicate Code" },
  { key: "revoked", label: "Revoked QR" },
  { key: "complete", label: "Complete" },
  { key: "needs_review", label: "Needs Review" },
];

function badgeTone(badge: string): string {
  if (badge === "Complete") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (badge.includes("Duplicate")) return "border-amber-200 bg-amber-50 text-amber-900";
  if (badge.includes("Missing")) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function AdmissionIdentityAuditPanel({
  eventId,
  open,
  onClose,
  onChanged,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [q, setQ] = useState("");
  const [issue, setIssue] = useState<AuditIssueFilter>("all_incomplete");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AuditResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [tab, setTab] = useState<"audit" | "duplicates">("audit");
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [regenTarget, setRegenTarget] = useState<{
    invitationId: string;
    target: "qr" | "code" | "link";
    name: string;
  } | null>(null);

  const load = useCallback(
    async (nextPage = page) => {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          eventId,
          issue,
          page: String(nextPage),
          limit: "20",
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/guests/admission-identity-audit?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not load audit.");
          return;
        }
        setData(json.data);
        setPage(json.data.page ?? nextPage);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [eventId, issue, page, q]
  );

  useEffect(() => {
    if (!open || !eventId) return;
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/event/issue reset
  }, [open, eventId, issue]);

  const loadDuplicates = useCallback(async () => {
    if (!eventId) return;
    setDupLoading(true);
    try {
      const res = await fetch(`/api/guests/duplicates?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setDuplicates(json.data?.pairs ?? []);
    } finally {
      setDupLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && tab === "duplicates") void loadDuplicates();
  }, [open, tab, loadDuplicates]);

  const summary = data?.summary;

  const allVisibleSelected = useMemo(() => {
    if (!data?.items.length) return false;
    return data.items.every((row) => selected.has(row.invitationId));
  }, [data, selected]);

  function toggleAllVisible() {
    if (!data) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        data.items.forEach((row) => next.delete(row.invitationId));
      } else {
        data.items.forEach((row) => next.add(row.invitationId));
      }
      return next;
    });
  }

  async function generateOne(
    invitationId: string,
    mode: "complete" | "qr" | "code" | "link"
  ) {
    setBusyId(invitationId);
    setError("");
    try {
      const res = await fetch("/api/guests/admission-identity/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, mode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Generation failed");
        return;
      }
      await load(page);
      onChanged?.();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRegenerate() {
    if (!regenTarget) return;
    setBusyId(regenTarget.invitationId);
    setError("");
    try {
      const res = await fetch("/api/guests/admission-identity/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: regenTarget.invitationId,
          target: regenTarget.target,
          reason: `Organiser regenerated ${regenTarget.target} for ${regenTarget.name}`,
          confirmRegenerate: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Regeneration failed");
        return;
      }
      setRegenTarget(null);
      await load(page);
      onChanged?.();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function bulkComplete() {
    if (!eventId || selected.size === 0) return;
    const ok = window.confirm(
      `Complete admission identity for ${selected.size} invitation(s)?\n\nAmbiguous duplicates are skipped. Plus-ones are never separate rows.`
    );
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guests/admission-identity/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          invitationIds: [...selected],
          mode: "complete",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Bulk generation failed");
        return;
      }
      setSelected(new Set());
      await load(page);
      onChanged?.();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function copyLink(path: string) {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
  }

  async function archiveDup(dupId: string, canonicalId: string, name: string) {
    const reason = window.prompt(
      `Archive “${name}” as a duplicate?\nRSVP, admission and seating history are preserved on archive.\n\nEnter a short reason:`,
      "Confirmed duplicate invitation"
    );
    if (!reason) return;
    const res = await fetch("/api/guests/duplicates/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        invitationId: dupId,
        canonicalInvitationId: canonicalId,
        reason,
        confirm: true,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Archive failed");
      return;
    }
    await loadDuplicates();
    onChanged?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Missing QR and admission codes audit"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Missing QR &amp; Codes</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Audit each invitation party — never unnamed plus-ones or capacity slots.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close audit">
            <X className="h-5 w-5" />
          </Button>
        </header>

        {summary && (
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-4 sm:px-5">
            {[
              { label: "Incomplete", value: summary.incomplete },
              { label: "Missing QR", value: summary.missingQr },
              { label: "Missing Code", value: summary.missingCode },
              { label: "Complete", value: summary.complete },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 px-3 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-100 px-4 py-2 sm:px-5">
          <Button
            type="button"
            size="sm"
            variant={tab === "audit" ? "default" : "outline"}
            onClick={() => setTab("audit")}
          >
            Identity audit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "duplicates" ? "default" : "outline"}
            onClick={() => setTab("duplicates")}
          >
            Suspected duplicates
          </Button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-5">
            {error}
          </div>
        )}

        {tab === "audit" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-5">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void load(1);
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, phone, email, link, code, invitation ID…"
                  className="pl-9"
                  aria-label="Search invitations in audit"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {ISSUE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setIssue(f.key);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    issue === f.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={toggleAllVisible}>
                {allVisibleSelected ? "Clear page" : "Select page"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={bulkBusy || selected.size === 0}
                onClick={() => void bulkComplete()}
              >
                {bulkBusy ? "Working…" : `Complete selected (${selected.size})`}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void load(page)}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
              {loading && !data ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading audit…</p>
              ) : !data?.items.length ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="mt-2 font-semibold text-emerald-900">No matching incomplete parties</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Plus-ones and capacity slots are never listed as missing codes.
                  </p>
                </div>
              ) : (
                data.items.map((row) => (
                  <article
                    key={row.invitationId}
                    className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selected.has(row.invitationId)}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(row.invitationId);
                            else next.delete(row.invitationId);
                            return next;
                          });
                        }}
                        aria-label={`Select ${row.displayName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {row.displayName}
                          </h3>
                          {row.identity.badges.map((b) => (
                            <Badge key={b} variant="outline" className={badgeTone(b)}>
                              {b}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {row.eventTitle} · Party of {row.partySize}
                          {row.namedMemberCount > 0
                            ? ` · ${row.namedMemberCount} named`
                            : ""}
                          {row.additionalGuestSlots > 0
                            ? ` · ${row.additionalGuestSlots} additional slots`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Link {row.identity.linkOk ? "OK" : "missing"} · QR{" "}
                          {row.identity.qrOk ? "OK" : "missing"} · Code{" "}
                          {row.admissionCode
                            ? formatAdmissionCode(row.admissionCode)
                            : "missing"}{" "}
                          · Admitted {row.admittedCount}/{row.partySize}
                        </p>
                        {row.duplicateHint && (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-800">
                            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {row.duplicateHint}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.identity.status !== "COMPLETE" && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === row.invitationId}
                              onClick={() => void generateOne(row.invitationId, "complete")}
                            >
                              <QrCode className="h-4 w-4" />
                              Complete identity
                            </Button>
                          )}
                          {!row.identity.qrOk && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === row.invitationId}
                              onClick={() => void generateOne(row.invitationId, "qr")}
                            >
                              Generate QR
                            </Button>
                          )}
                          {!row.identity.codeOk && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === row.invitationId}
                              onClick={() => void generateOne(row.invitationId, "code")}
                            >
                              Generate code
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={row.invitePath} target="_blank">
                              Open invitation
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void copyLink(row.invitePath)}
                          >
                            <Copy className="h-4 w-4" /> Copy link
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setRegenTarget({
                                invitationId: row.invitationId,
                                target: "qr",
                                name: row.displayName,
                              })
                            }
                          >
                            Regenerate QR
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {data && (
              <PaginationBar
                page={data.page}
                pages={data.pages}
                total={data.total}
                limit={data.limit}
                onPageChange={(p) => {
                  setPage(p);
                  void load(p);
                }}
              />
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
            {dupLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Checking duplicates…</p>
            ) : !duplicates.length ? (
              <p className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
                No suspected duplicates. Same-table seating and shared surnames alone never count.
              </p>
            ) : (
              duplicates.map((pair) => (
                <article
                  key={`${pair.left.invitationId}-${pair.right.invitationId}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
                >
                  <p className="text-sm font-semibold text-amber-950">{pair.reasons[0]}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[pair.left, pair.right].map((side) => (
                      <div key={side.invitationId} className="rounded-lg border border-white bg-white p-3">
                        <p className="font-bold text-slate-900">{side.displayName}</p>
                        <p className="text-xs text-slate-500">
                          Party {side.partySize} · Code{" "}
                          {side.admissionCode
                            ? formatAdmissionCode(side.admissionCode)
                            : "—"}
                        </p>
                        <Link
                          href={side.invitePath}
                          target="_blank"
                          className="mt-1 inline-block text-xs font-semibold text-teal-700"
                        >
                          Open invitation
                        </Link>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void archiveDup(
                          pair.right.invitationId,
                          pair.left.invitationId,
                          pair.right.displayName
                        )
                      }
                    >
                      Archive right as duplicate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void archiveDup(
                          pair.left.invitationId,
                          pair.right.invitationId,
                          pair.left.displayName
                        )
                      }
                    >
                      Archive left as duplicate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void fetch("/api/guests/duplicates/compare", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            eventId,
                            leftInvitationId: pair.left.invitationId,
                            rightInvitationId: pair.right.invitationId,
                          }),
                        }).then(() =>
                          setDuplicates((prev) =>
                            prev.filter(
                              (p) =>
                                !(
                                  p.left.invitationId === pair.left.invitationId &&
                                  p.right.invitationId === pair.right.invitationId
                                )
                            )
                          )
                        );
                      }}
                    >
                      Mark as not duplicate
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {regenTarget && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900">Regenerate {regenTarget.target}?</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>The old QR or link may stop working.</li>
                <li>Previously shared copies may become invalid.</li>
                <li>The new identity stays on the same invitation party ({regenTarget.name}).</li>
                <li>Admission and RSVP history are preserved.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void confirmRegenerate()}>
                  Confirm regenerate
                </Button>
                <Button type="button" variant="outline" onClick={() => setRegenTarget(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
