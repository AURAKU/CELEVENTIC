"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import {
  DEFAULT_ACCESS_ZONES,
  VENDOR_PASS_TYPE_OPTIONS,
} from "@/lib/vendor-pass/capacity";
import { Copy, Loader2, Plus, RefreshCw, Shield } from "lucide-react";
import { buildVendorTeamPassUrl } from "@/lib/vendor-pass/token-format";

type VendorPassRow = {
  id: string;
  title: string;
  vendorName: string;
  passType: string;
  passMode: string;
  entryMode: string;
  teamCapacity: number;
  admittedCount: number;
  remainingCount: number;
  admissionCode: string;
  status: string;
  accessZones: string[];
  passUrl: string;
  publicToken: string;
  contactName: string | null;
  lastAdmittedAt: string | null;
};

/** Always resolve against the current origin so local passes don’t open on live (and vice versa). */
function resolvePassHref(row: Pick<VendorPassRow, "publicToken" | "passUrl">): string {
  if (typeof window === "undefined") {
    return row.passUrl || buildVendorTeamPassUrl(row.publicToken);
  }
  return buildVendorTeamPassUrl(row.publicToken, window.location.origin);
}

/** Prefer a short operator message over raw Prisma / SQLite stack text. */
function vendorPassErrorMessage(raw: unknown, fallback: string): string {
  const text =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message?: unknown }).message ?? "")
        : "";
  if (/vendor_team_passes|does not exist in the current database/i.test(text)) {
    return "Vendor pass tables are missing from this database. Run Prisma migrations (vendor_team_passes), then refresh.";
  }
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  // Keep UI readable — drop multi-line Prisma invocation dumps.
  const firstLine = trimmed.split("\n").map((l) => l.trim()).find(Boolean) ?? trimmed;
  return firstLine.length > 220 ? `${firstLine.slice(0, 217)}…` : firstLine;
}

export function VendorTeamPassesPanel({
  eventId,
  openCreateDefault = false,
}: {
  eventId: string;
  openCreateDefault?: boolean;
}) {
  const [rows, setRows] = useState<VendorPassRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(openCreateDefault);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (openCreateDefault) setCreating(true);
  }, [openCreateDefault]);

  const [form, setForm] = useState({
    title: "",
    vendorName: "",
    contactName: "",
    phone: "",
    email: "",
    passType: "MUSICAL_BAND",
    passMode: "TEAM" as "INDIVIDUAL" | "TEAM",
    entryMode: "INDIVIDUAL_ENTRY",
    teamCapacity: 8,
    notes: "",
    memberNames: "",
  });

  const load = useCallback(
    async (nextPage = page) => {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: "20",
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/vendor-passes?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setError(vendorPassErrorMessage(json.error, "Could not load vendor passes"));
          return;
        }
        setRows(json.data.items ?? []);
        setPage(json.data.page ?? nextPage);
        setPages(json.data.pages ?? 1);
        setTotal(json.data.total ?? 0);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [eventId, page, q]
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function createPass() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/vendor-passes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          vendorName: form.vendorName,
          contactName: form.contactName || null,
          phone: form.phone || null,
          email: form.email || null,
          passType: form.passType,
          passMode: form.passMode,
          entryMode: form.entryMode,
          teamCapacity: form.passMode === "INDIVIDUAL" ? 1 : form.teamCapacity,
          accessZones: [...DEFAULT_ACCESS_ZONES],
          notes: form.notes || null,
          memberNames: form.memberNames
            .split(/\n|,/)
            .map((n) => n.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(vendorPassErrorMessage(json.error, "Could not create pass"));
        return;
      }
      setCreating(false);
      setForm({
        title: "",
        vendorName: "",
        contactName: "",
        phone: "",
        email: "",
        passType: "MUSICAL_BAND",
        passMode: "TEAM",
        entryMode: "INDIVIDUAL_ENTRY",
        teamCapacity: 8,
        notes: "",
        memberNames: "",
      });
      await load(1);
      if (json.data?.publicToken) {
        window.open(buildVendorTeamPassUrl(json.data.publicToken, window.location.origin), "_blank");
      } else if (json.data?.passUrl) {
        window.open(resolvePassHref(json.data), "_blank");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this vendor pass? Scanners will reject it.")) return;
    const res = await fetch(`/api/vendor-passes/${id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Revoked from Guest CRM" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Revoke failed");
      return;
    }
    await load(page);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vendor &amp; Team Passes</h2>
          <p className="text-sm text-slate-600">
            Separate from guest invitations. Shared team QR admits up to the configured capacity.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Generate Vendor Pass
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {creating && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-slate-900">New vendor / team pass</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Pass title</span>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="GOLDEN RHYTHMS BAND"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Vendor / team name</span>
              <Input
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                placeholder="Golden Rhythms Musical Band"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Contact person</span>
              <Input
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Pass type</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3"
                value={form.passType}
                onChange={(e) => setForm((f) => ({ ...f, passType: e.target.value }))}
              >
                {VENDOR_PASS_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Phone</span>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Pass mode</legend>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.passMode === "INDIVIDUAL" ? "default" : "outline"}
                  onClick={() => setForm((f) => ({ ...f, passMode: "INDIVIDUAL", teamCapacity: 1 }))}
                >
                  Individual · 1 person
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.passMode === "TEAM" ? "default" : "outline"}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      passMode: "TEAM",
                      teamCapacity: Math.max(2, f.teamCapacity),
                    }))
                  }
                >
                  Team · 2+ people
                </Button>
              </div>
            </fieldset>
            {form.passMode === "TEAM" && (
              <label className="text-sm">
                <span className="mb-1 block font-medium">Number of people (capacity)</span>
                <Input
                  type="number"
                  min={2}
                  max={500}
                  value={form.teamCapacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teamCapacity: Number(e.target.value) || 2 }))
                  }
                />
              </label>
            )}
            <label className="text-sm">
              <span className="mb-1 block font-medium">Entry mode</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3"
                value={form.entryMode}
                onChange={(e) => setForm((f) => ({ ...f, entryMode: e.target.value }))}
              >
                <option value="INDIVIDUAL_ENTRY">Individual team entry (1 per scan)</option>
                <option value="SELECT_QUANTITY">Select quantity at gate</option>
                <option value="ADMIT_FULL_TEAM">Admit full team (confirm)</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Optional named members (one per line)</span>
              <textarea
                className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.memberNames}
                onChange={(e) => setForm((f) => ({ ...f, memberNames: e.target.value }))}
                placeholder="Optional — leave blank for shared team identity"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Notes for security</span>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void createPass()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Create pass
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void load(1);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, vendor, code, contact…"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        <Button type="button" variant="ghost" onClick={() => void load(page)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-2">
        {loading && !rows.length ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading vendor passes…</p>
        ) : !rows.length ? (
          <p className="rounded-xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
            No vendor or team passes yet. Guest invitations stay on the Guests list.
          </p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">{row.title}</h3>
                  <p className="text-sm text-slate-600">{row.vendorName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{row.passMode}</Badge>
                    <Badge variant="outline">{row.status}</Badge>
                    <Badge variant="outline">
                      {row.admittedCount}/{row.teamCapacity} admitted
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {row.admissionCode}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Access: {row.accessZones.join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={buildVendorTeamPassUrl(row.publicToken)} target="_blank">
                      View Pass
                    </Link>
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a
                      href={`/api/vendor-pass/qr-image?${new URLSearchParams({
                        publicToken: row.publicToken,
                        kind: "card",
                        download: "1",
                      }).toString()}`}
                      download
                    >
                      Download card
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      window.open(resolvePassHref(row), "_blank");
                      window.setTimeout(() => window.print(), 900);
                    }}
                  >
                    Print
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void navigator.clipboard.writeText(resolvePassHref(row))}
                  >
                    <Copy className="h-4 w-4" /> Copy link
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `${row.title} — ${row.vendorName}\nAccess code ${row.admissionCode}\n${resolvePassHref(row)}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = window.prompt(
                        "New team capacity (cannot go below admitted count):",
                        String(row.teamCapacity)
                      );
                      if (!next) return;
                      const capacity = Number(next);
                      if (!Number.isFinite(capacity)) return;
                      const confirmChange =
                        row.admittedCount > 0
                          ? window.confirm(
                              `Capacity change after admissions (${row.admittedCount} already in). Continue?`
                            )
                          : true;
                      if (!confirmChange) return;
                      void fetch(`/api/vendor-passes/${row.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          teamCapacity: capacity,
                          confirmCapacityChange: row.admittedCount > 0,
                        }),
                      }).then(async (res) => {
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          setError(json.error ?? "Capacity update failed");
                          return;
                        }
                        await load(page);
                      });
                    }}
                  >
                    Capacity
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Regenerate QR and access code? Old printed passes will stop working."
                        )
                      ) {
                        return;
                      }
                      void fetch(`/api/vendor-passes/${row.id}/regenerate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          target: "both",
                          reason: "Regenerated from Guest CRM",
                          confirm: true,
                        }),
                      }).then(async (res) => {
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          setError(json.error ?? "Regenerate failed");
                          return;
                        }
                        await load(page);
                      });
                    }}
                  >
                    Regenerate
                  </Button>
                  {row.status !== "REVOKED" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void revoke(row.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        pages={pages}
        total={total}
        limit={20}
        onPageChange={(p) => {
          setPage(p);
          void load(p);
        }}
      />
    </section>
  );
}
