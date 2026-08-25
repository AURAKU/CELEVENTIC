"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import {
  DEFAULT_ACCESS_ZONES,
  VENDOR_ACCESS_MODE_OPTIONS,
} from "@/lib/vendor-pass/capacity";
import {
  mergeVendorPassTypeOptions,
  vendorPassTypeLabel,
  type VendorPassTypeOption,
} from "@/lib/vendor-pass/pass-types";
import {
  Copy,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Settings2,
  Shield,
  Trash2,
} from "lucide-react";
import { buildVendorTeamPassUrl } from "@/lib/vendor-pass/token-format";
import { VendorEntryLog } from "@/components/vendor-pass/vendor-entry-log";
import { ensureSingleShareUrl, openWhatsAppShare } from "@/lib/invitation/whatsapp-share";

type VendorPassRow = {
  id: string;
  title: string;
  vendorName: string;
  passType: string;
  categoryLabel: string | null;
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
  phone: string | null;
  email: string | null;
  companyName: string | null;
  notes: string | null;
  vehicleRegistration: string | null;
  validFrom: string | null;
  validUntil: string | null;
  lastAdmittedAt: string | null;
  reentryPolicy: string;
  reentryLimit: number | null;
  reentryRemaining: number | null;
  multiEntry: boolean;
  accessLabel: string;
  entryCycle: number;
  totalEntries: number;
  totalAdmitted: number;
};

type VendorPassEditForm = {
  title: string;
  vendorName: string;
  contactName: string;
  phone: string;
  email: string;
  companyName: string;
  passType: string;
  entryMode: string;
  teamCapacity: number;
  reentryPolicy: string;
  reentryLimit: number;
  accessZones: string;
  vehicleRegistration: string;
  notes: string;
  validUntil: string;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyEditForm(passType = "MUSICAL_BAND"): VendorPassEditForm {
  return {
    title: "",
    vendorName: "",
    contactName: "",
    phone: "",
    email: "",
    companyName: "",
    passType,
    entryMode: "INDIVIDUAL_ENTRY",
    teamCapacity: 8,
    reentryPolicy: "UNLIMITED",
    reentryLimit: 2,
    accessZones: DEFAULT_ACCESS_ZONES.join(", "),
    vehicleRegistration: "",
    notes: "",
    validUntil: "",
  };
}

function editFormFromRow(row: VendorPassRow): VendorPassEditForm {
  return {
    title: row.title ?? "",
    vendorName: row.vendorName ?? "",
    contactName: row.contactName ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    companyName: row.companyName ?? "",
    passType: row.passType ?? "MUSICAL_BAND",
    entryMode: row.entryMode ?? "INDIVIDUAL_ENTRY",
    teamCapacity: row.teamCapacity || 1,
    reentryPolicy: row.reentryPolicy || "UNLIMITED",
    reentryLimit: row.reentryLimit ?? 2,
    accessZones: (row.accessZones?.length ? row.accessZones : [...DEFAULT_ACCESS_ZONES]).join(", "),
    vehicleRegistration: row.vehicleRegistration ?? "",
    notes: row.notes ?? "",
    validUntil: toDatetimeLocal(row.validUntil),
  };
}

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
  /** Pass currently open in the inline editor (null = closed). */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VendorPassEditForm>(() => emptyEditForm());
  const [editBusy, setEditBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Pass ids whose entry log is expanded, and a per-pass refetch counter. */
  const [openLogs, setOpenLogs] = useState<Record<string, boolean>>({});
  const [logReload, setLogReload] = useState<Record<string, number>>({});
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  /** Per-event pass types: the picker plus the organiser's manage panel. */
  const [passTypes, setPassTypes] = useState<VendorPassTypeOption[]>(() =>
    mergeVendorPassTypeOptions([])
  );
  const [hiddenTypes, setHiddenTypes] = useState<Array<{ key: string; label: string }>>([]);
  const [typeUsage, setTypeUsage] = useState<Record<string, number>>({});
  const [managingTypes, setManagingTypes] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [typeBusy, setTypeBusy] = useState(false);
  const [typeError, setTypeError] = useState("");

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
    reentryPolicy: "UNLIMITED",
    reentryLimit: 2,
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

  const loadPassTypes = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/vendor-pass-types`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const options: VendorPassTypeOption[] = json.data?.options ?? [];
      if (!options.length) return;
      setPassTypes(options);
      setHiddenTypes(json.data?.hidden ?? []);
      setTypeUsage(
        Object.fromEntries(
          (json.data?.managed ?? []).map((item: { key: string; inUseCount: number }) => [
            item.key,
            item.inUseCount,
          ])
        )
      );
      // The selected type may have just been removed by another organiser.
      setForm((f) =>
        options.some((option) => option.value === f.passType)
          ? f
          : { ...f, passType: options[0].value }
      );
    } catch {
      // The built-in list stays usable when the picker cannot be refreshed.
    }
  }, [eventId]);

  useEffect(() => {
    void load(1);
    void loadPassTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addPassType() {
    const label = newTypeLabel.trim();
    if (label.length < 2) {
      setTypeError("Enter a pass type name (at least 2 characters).");
      return;
    }
    setTypeBusy(true);
    setTypeError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/vendor-pass-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(vendorPassErrorMessage(json.error, "Could not add pass type"));
        return;
      }
      setNewTypeLabel("");
      await loadPassTypes();
      if (json.data?.value) setForm((f) => ({ ...f, passType: json.data.value }));
      setNotice(`Pass type "${json.data?.label ?? label}" added.`);
    } catch {
      setTypeError("Could not reach the server.");
    } finally {
      setTypeBusy(false);
    }
  }

  async function restorePassType(key: string) {
    setTypeBusy(true);
    setTypeError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/vendor-pass-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(vendorPassErrorMessage(json.error, "Could not restore pass type"));
        return;
      }
      await loadPassTypes();
    } catch {
      setTypeError("Could not reach the server.");
    } finally {
      setTypeBusy(false);
    }
  }

  /**
   * Removing a type never invalidates a printed pass: the server hides built-ins
   * and deactivates custom types that are still in use, and only asks for
   * confirmation when passes would be affected.
   */
  async function removePassType(option: VendorPassTypeOption) {
    const verb = option.deletable ? "Delete" : "Hide";
    if (!window.confirm(`${verb} the "${option.label}" pass type for this event?`)) return;

    setTypeBusy(true);
    setTypeError("");
    try {
      const url = `/api/events/${encodeURIComponent(eventId)}/vendor-pass-types/${encodeURIComponent(option.key)}`;
      let res = await fetch(url, { method: "DELETE" });
      let json = await res.json().catch(() => ({}));

      if (!res.ok && json?.requiresConfirmation) {
        if (!window.confirm(`${json.error}`)) return;
        res = await fetch(`${url}?confirm=1`, { method: "DELETE" });
        json = await res.json().catch(() => ({}));
      }
      if (!res.ok) {
        setTypeError(vendorPassErrorMessage(json.error, "Could not remove pass type"));
        return;
      }
      await loadPassTypes();
      setNotice(json.data?.message ?? "Pass type removed.");
    } catch {
      setTypeError("Could not reach the server.");
    } finally {
      setTypeBusy(false);
    }
  }

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
          reentryPolicy: form.reentryPolicy,
          reentryLimit: form.reentryPolicy === "CUSTOM" ? form.reentryLimit : null,
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
      setForm((f) => ({
        title: "",
        vendorName: "",
        contactName: "",
        phone: "",
        email: "",
        // Keep the type selected — hosts usually issue several of the same kind.
        passType: f.passType,
        passMode: "TEAM",
        entryMode: "INDIVIDUAL_ENTRY",
        teamCapacity: 8,
        reentryPolicy: "UNLIMITED",
        reentryLimit: 2,
        notes: "",
        memberNames: "",
      }));
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

  /**
   * Host-side admission for a vendor who walked up without a scanner. Uses the
   * same service as the gate, so the entry log reads identically either way.
   */
  async function admitOne(row: VendorPassRow) {
    setAdmittingId(row.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/vendor-passes/${row.id}/admit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "one", quantity: 1 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setError(vendorPassErrorMessage(json?.error, "Could not log this entry"));
        return;
      }
      setNotice(`Entry logged for ${row.title}.`);
      setLogReload((prev) => ({ ...prev, [row.id]: (prev[row.id] ?? 0) + 1 }));
      await load(page);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setAdmittingId(null);
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
    setNotice("Pass revoked. Scanners will reject it.");
    await load(page);
  }

  async function startEdit(row: VendorPassRow) {
    setCreating(false);
    setEditingId(row.id);
    setEditForm(editFormFromRow(row));
    setError("");
    setNotice("");
    // Refresh from GET so notes / contact / expiry match the database, not a stale list row.
    try {
      const res = await fetch(`/api/vendor-passes/${encodeURIComponent(row.id)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data) {
        setEditForm(editFormFromRow(json.data as VendorPassRow));
      }
    } catch {
      // List row values are already in the form — editing can still proceed.
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyEditForm(passTypes[0]?.value ?? "MUSICAL_BAND"));
  }

  async function saveEdit() {
    if (!editingId) return;
    const title = editForm.title.trim();
    const vendorName = editForm.vendorName.trim();
    if (title.length < 2 || vendorName.length < 2) {
      setError("Pass title and vendor name need at least 2 characters.");
      return;
    }

    const row = rows.find((r) => r.id === editingId);
    const capacity = Math.max(1, Math.trunc(editForm.teamCapacity) || 1);
    const confirmCapacityChange =
      Boolean(row && row.admittedCount > 0 && capacity !== row.teamCapacity);

    if (confirmCapacityChange) {
      const ok = window.confirm(
        `Capacity change after admissions (${row!.admittedCount} already in this entry). Continue?`
      );
      if (!ok) return;
    }

    setEditBusy(true);
    setError("");
    setNotice("");
    try {
      const zones = editForm.accessZones
        .split(/[·|,]/)
        .map((z) => z.trim())
        .filter(Boolean);
      const res = await fetch(`/api/vendor-passes/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          vendorName,
          contactName: editForm.contactName.trim() || null,
          phone: editForm.phone.trim() || null,
          email: editForm.email.trim() || null,
          companyName: editForm.companyName.trim() || null,
          passType: editForm.passType,
          entryMode: editForm.entryMode,
          teamCapacity: capacity,
          confirmCapacityChange,
          reentryPolicy: editForm.reentryPolicy,
          reentryLimit: editForm.reentryPolicy === "CUSTOM" ? editForm.reentryLimit : null,
          accessZones: zones.length ? zones : [...DEFAULT_ACCESS_ZONES],
          vehicleRegistration: editForm.vehicleRegistration.trim() || null,
          notes: editForm.notes.trim() || null,
          validUntil: editForm.validUntil.trim()
            ? new Date(editForm.validUntil).toISOString()
            : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(vendorPassErrorMessage(json.error, "Could not save vendor pass"));
        return;
      }
      setNotice(`Updated “${title}”.`);
      cancelEdit();
      await load(page);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setEditBusy(false);
    }
  }

  /**
   * Hard-delete when there is no admission history. Passes with scan history
   * must be archived instead so the entry log stays intact — QR still becomes
   * invalid and the pass leaves this list.
   */
  async function deletePass(row: VendorPassRow) {
    const hardMsg =
      `Permanently delete “${row.title}”?\n\n` +
      `The pass QR and access code will stop working immediately.\n` +
      `This cannot be undone.`;
    if (!window.confirm(hardMsg)) return;

    setDeletingId(row.id);
    setError("");
    setNotice("");
    try {
      let res = await fetch(`/api/vendor-passes/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      let json = await res.json().catch(() => ({}));

      if (!res.ok && (json?.code === "HAS_ADMISSION_HISTORY" || /admission history/i.test(String(json.error ?? "")))) {
        const archiveOk = window.confirm(
          `“${row.title}” has admission history, so it cannot be permanently deleted.\n\n` +
            `Archive it instead?\n` +
            `The QR and access code will stop working, and the pass will leave this list.\n` +
            `Entry history is kept for your records.`
        );
        if (!archiveOk) return;
        res = await fetch(`/api/vendor-passes/${encodeURIComponent(row.id)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true, archive: true }),
        });
        json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(vendorPassErrorMessage(json.error, "Could not archive vendor pass"));
          return;
        }
        if (editingId === row.id) cancelEdit();
        setNotice(`Archived “${row.title}”. The QR no longer works.`);
        await load(page);
        return;
      }

      if (!res.ok) {
        setError(vendorPassErrorMessage(json.error, "Could not delete vendor pass"));
        return;
      }
      if (editingId === row.id) cancelEdit();
      setNotice(`Deleted “${row.title}”. The QR no longer works.`);
      await load(page);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeletingId(null);
    }
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
        <Button
          type="button"
          onClick={() => {
            cancelEdit();
            setCreating(true);
          }}
        >
          <Plus className="h-4 w-4" /> Generate Vendor Pass
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
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
              <span className="mb-1 block font-medium">Contact person name</span>
              <Input
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Full name"
              />
            </label>
            <div className="text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="font-medium" htmlFor="vendor-pass-type">
                  Pass type
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  onClick={() => setManagingTypes((open) => !open)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {managingTypes ? "Done" : "Manage types"}
                </button>
              </div>
              <select
                id="vendor-pass-type"
                className="h-10 w-full rounded-md border border-slate-200 px-3"
                value={form.passType}
                onChange={(e) => setForm((f) => ({ ...f, passType: e.target.value }))}
              >
                {passTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {managingTypes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-sm font-medium text-slate-900">Pass types for this event</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Add your own types (Catering, Security, DJ crew…). Removing a type never
                  affects passes already issued — they keep their printed label.
                </p>

                {typeError && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {typeError}
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="New pass type (e.g. Catering)"
                    maxLength={60}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addPassType();
                      }
                    }}
                  />
                  <Button type="button" size="sm" disabled={typeBusy} onClick={() => void addPassType()}>
                    {typeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add type
                  </Button>
                </div>

                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {passTypes.map((opt) => (
                    <li
                      key={opt.value}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs text-slate-700"
                    >
                      <span>{opt.label}</span>
                      {opt.source === "CUSTOM" && (typeUsage[opt.key] ?? 0) > 0 && (
                        <span className="text-slate-400">· {typeUsage[opt.key]} in use</span>
                      )}
                      <button
                        type="button"
                        disabled={typeBusy}
                        aria-label={`${opt.deletable ? "Delete" : "Hide"} ${opt.label}`}
                        title={
                          opt.deletable
                            ? "Delete this custom pass type"
                            : "Built-in type — hide it for this event"
                        }
                        className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        onClick={() => void removePassType(opt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                {hiddenTypes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-600">Hidden built-in types</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {hiddenTypes.map((hidden) => (
                        <li key={hidden.key}>
                          <button
                            type="button"
                            disabled={typeBusy}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 py-1 pl-3 pr-2 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                            onClick={() => void restorePassType(hidden.key)}
                          >
                            {hidden.label}
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <label className="text-sm">
              <span className="mb-1 block font-medium">Phone (optional)</span>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Email (optional)</span>
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
            <label className="text-sm">
              <span className="mb-1 block font-medium">Access mode</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3"
                value={form.reentryPolicy}
                onChange={(e) => setForm((f) => ({ ...f, reentryPolicy: e.target.value }))}
              >
                {VENDOR_ACCESS_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                {VENDOR_ACCESS_MODE_OPTIONS.find((o) => o.value === form.reentryPolicy)?.hint ?? ""}
              </span>
            </label>
            {form.reentryPolicy === "CUSTOM" && (
              <label className="text-sm">
                <span className="mb-1 block font-medium">Re-entries allowed</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.reentryLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reentryLimit: Number(e.target.value) || 1 }))
                  }
                />
              </label>
            )}
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
                    <Badge variant="outline">
                      {vendorPassTypeLabel(row.passType, row.categoryLabel)}
                    </Badge>
                    <Badge variant="outline">{row.passMode}</Badge>
                    <Badge variant="outline">{row.status}</Badge>
                    <Badge variant={row.multiEntry ? "success" : "outline"}>
                      {row.accessLabel}
                    </Badge>
                    <Badge variant="outline">
                      {row.admittedCount}/{row.teamCapacity} in this entry
                    </Badge>
                    {row.totalEntries > 0 && (
                      <Badge variant="outline">
                        {row.totalEntries} scans · {row.totalAdmitted} admitted all-time
                      </Badge>
                    )}
                    {row.entryCycle > 1 && <Badge variant="outline">Entry #{row.entryCycle}</Badge>}
                    <Badge variant="outline" className="font-mono">
                      {row.admissionCode}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Access: {row.accessZones.join(" · ")}
                    {row.lastAdmittedAt
                      ? ` · last entry ${new Date(row.lastAdmittedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={editBusy || deletingId === row.id}
                    onClick={() => {
                      if (editingId === row.id) cancelEdit();
                      else void startEdit(row);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    {editingId === row.id ? "Close edit" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    disabled={deletingId === row.id || editBusy}
                    onClick={() => void deletePass(row)}
                    title="Permanently delete this vendor pass (or archive if it has entry history)"
                  >
                    {deletingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={admittingId === row.id || row.status === "REVOKED"}
                    onClick={() => void admitOne(row)}
                  >
                    {admittingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    Log entry
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenLogs((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                  >
                    <ScrollText className="h-4 w-4" />
                    {openLogs[row.id] ? "Hide entry log" : "Entry log"}
                  </Button>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.preventDefault();
                      const href = resolvePassHref(row);
                      openWhatsAppShare(
                        ensureSingleShareUrl(
                          `${row.title} — ${row.vendorName}\nAccess code ${row.admissionCode}`,
                          href
                        )
                      );
                    }}
                  >
                    WhatsApp
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

              {editingId === row.id && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
                  <h4 className="font-bold text-slate-900">Edit vendor / team pass</h4>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Changes apply immediately. The same QR keeps working unless you regenerate it.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Pass title</span>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Vendor / team name</span>
                      <Input
                        value={editForm.vendorName}
                        onChange={(e) => setEditForm((f) => ({ ...f, vendorName: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Contact person name</span>
                      <Input
                        value={editForm.contactName}
                        onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Pass type</span>
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
                        value={editForm.passType}
                        onChange={(e) => setEditForm((f) => ({ ...f, passType: e.target.value }))}
                      >
                        {passTypes.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        {!passTypes.some((opt) => opt.value === editForm.passType) && (
                          <option value={editForm.passType}>
                            {vendorPassTypeLabel(editForm.passType, row.categoryLabel)}
                          </option>
                        )}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Phone (optional)</span>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Email (optional)</span>
                      <Input
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Company (optional)</span>
                      <Input
                        value={editForm.companyName}
                        onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Capacity (people)</span>
                      <Input
                        type="number"
                        min={Math.max(1, row.admittedCount)}
                        max={500}
                        value={editForm.teamCapacity}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            teamCapacity: Number(e.target.value) || 1,
                          }))
                        }
                      />
                      {row.admittedCount > 0 && (
                        <span className="mt-1 block text-xs text-slate-500">
                          Cannot go below {row.admittedCount} already admitted in this entry.
                        </span>
                      )}
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Entry mode</span>
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
                        value={editForm.entryMode}
                        onChange={(e) => setEditForm((f) => ({ ...f, entryMode: e.target.value }))}
                      >
                        <option value="INDIVIDUAL_ENTRY">Individual team entry (1 per scan)</option>
                        <option value="SELECT_QUANTITY">Select quantity at gate</option>
                        <option value="ADMIT_FULL_TEAM">Admit full team (confirm)</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Access mode</span>
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
                        value={editForm.reentryPolicy}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, reentryPolicy: e.target.value }))
                        }
                      >
                        {VENDOR_ACCESS_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {editForm.reentryPolicy === "CUSTOM" && (
                      <label className="text-sm">
                        <span className="mb-1 block font-medium">Re-entries allowed</span>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={editForm.reentryLimit}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              reentryLimit: Number(e.target.value) || 1,
                            }))
                          }
                        />
                      </label>
                    )}
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Expires (optional)</span>
                      <Input
                        type="datetime-local"
                        value={editForm.validUntil}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, validUntil: e.target.value }))
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Vehicle registration (optional)</span>
                      <Input
                        value={editForm.vehicleRegistration}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, vehicleRegistration: e.target.value }))
                        }
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1 block font-medium">Access zones</span>
                      <Input
                        value={editForm.accessZones}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, accessZones: e.target.value }))
                        }
                        placeholder="Main Entrance, General Event Area"
                      />
                      <span className="mt-1 block text-xs text-slate-500">
                        Comma-separated zones shown on the pass and at the gate.
                      </span>
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1 block font-medium">Notes for security</span>
                      <Input
                        value={editForm.notes}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" disabled={editBusy} onClick={() => void saveEdit()}>
                      {editBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      Save changes
                    </Button>
                    <Button type="button" variant="outline" disabled={editBusy} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {openLogs[row.id] && (
                <VendorEntryLog
                  passId={row.id}
                  className="mt-4"
                  reloadToken={logReload[row.id] ?? 0}
                />
              )}
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
