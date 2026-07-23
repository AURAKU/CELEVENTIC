"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { formatCurrency } from "@/lib/utils";
import {
  ALL_FEATURE_KEYS,
  type FeatureKey,
} from "@/lib/blueprints/feature-keys";
import {
  featureLabel,
  featuresByGroup,
  normalizePackageFeatureKeys,
} from "@/lib/packages/feature-catalog";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export interface PackageRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  currency: string;
  guestLimit: number;
  invitationLimit: number;
  ticketLimit: number;
  smsCredits: number;
  whatsappCredits: number;
  emailCredits: number;
  features: unknown;
  isActive: boolean;
  sortOrder: number;
  packageFeatures?: { featureKey: string; isIncluded: boolean }[];
  _count?: { events: number };
}

type FormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  guestLimit: string;
  invitationLimit: string;
  ticketLimit: string;
  smsCredits: string;
  whatsappCredits: string;
  emailCredits: string;
  sortOrder: string;
  isActive: boolean;
  featureKeys: Set<string>;
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  description: "",
  price: "0",
  currency: "GHS",
  guestLimit: "100",
  invitationLimit: "50",
  ticketLimit: "500",
  smsCredits: "0",
  whatsappCredits: "0",
  emailCredits: "0",
  sortOrder: "0",
  isActive: true,
  featureKeys: new Set([
    "OVERVIEW",
    "SETTINGS",
    "INVITATIONS",
    "GUEST_LIST",
    "RSVP",
    "QR_ADMISSION",
  ]),
});

function resolveFeatureKeys(pkg: PackageRow): string[] {
  const fromRows =
    pkg.packageFeatures
      ?.filter((f) => f.isIncluded)
      .map((f) => f.featureKey) ?? [];
  if (fromRows.length > 0) return fromRows;
  return normalizePackageFeatureKeys(pkg.features);
}

function toForm(pkg: PackageRow): FormState {
  return {
    name: pkg.name,
    slug: pkg.slug,
    description: pkg.description ?? "",
    price: String(pkg.price),
    currency: pkg.currency || "GHS",
    guestLimit: String(pkg.guestLimit),
    invitationLimit: String(pkg.invitationLimit),
    ticketLimit: String(pkg.ticketLimit),
    smsCredits: String(pkg.smsCredits),
    whatsappCredits: String(pkg.whatsappCredits),
    emailCredits: String(pkg.emailCredits ?? 0),
    sortOrder: String(pkg.sortOrder),
    isActive: pkg.isActive,
    featureKeys: new Set(resolveFeatureKeys(pkg)),
  };
}

function serializePackage(raw: Record<string, unknown>): PackageRow {
  return {
    id: String(raw.id),
    name: String(raw.name),
    slug: String(raw.slug),
    description: (raw.description as string | null) ?? null,
    price: String(raw.price ?? "0"),
    currency: String(raw.currency ?? "GHS"),
    guestLimit: Number(raw.guestLimit ?? 0),
    invitationLimit: Number(raw.invitationLimit ?? 0),
    ticketLimit: Number(raw.ticketLimit ?? 0),
    smsCredits: Number(raw.smsCredits ?? 0),
    whatsappCredits: Number(raw.whatsappCredits ?? 0),
    emailCredits: Number(raw.emailCredits ?? 0),
    features: raw.features,
    isActive: Boolean(raw.isActive),
    sortOrder: Number(raw.sortOrder ?? 0),
    packageFeatures: raw.packageFeatures as PackageRow["packageFeatures"],
    _count: raw._count as PackageRow["_count"],
  };
}

const FEATURE_GROUPS = featuresByGroup();

export function AdminPackagesClient({
  initial,
  initialTotal,
  initialPages,
}: {
  initial: PackageRow[];
  initialTotal: number;
  initialPages: number;
}) {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [packages, setPackages] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(initialPages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [featureFilter, setFeatureFilter] = useState("");

  const editingPkg = useMemo(
    () => packages.find((p) => p.id === editingId) ?? null,
    [packages, editingId]
  );

  const reload = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    const res = await fetch(`/api/admin/packages?${params}`);
    const d = await res.json();
    if (d.success) {
      const items = (d.data.items ?? d.data) as Record<string, unknown>[];
      setPackages(items.map(serializePackage));
      setTotal(d.data.total ?? items.length);
      setPages(d.data.pages ?? 1);
    }
  }, [appendToParams]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSavedFlash(false);
  }

  function startEdit(pkg: PackageRow) {
    setCreating(false);
    setEditingId(pkg.id);
    setForm(toForm(pkg));
    setError("");
    setSavedFlash(false);
    setFeatureFilter("");
  }

  function closeEditor() {
    setCreating(false);
    setEditingId(null);
    setError("");
    setSavedFlash(false);
  }

  function toggleFeature(key: string) {
    setForm((prev) => {
      const next = new Set(prev.featureKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, featureKeys: next };
    });
    setSavedFlash(false);
  }

  function selectAllFeatures() {
    setForm((prev) => ({ ...prev, featureKeys: new Set(ALL_FEATURE_KEYS) }));
    setSavedFlash(false);
  }

  function clearFeatures() {
    setForm((prev) => ({
      ...prev,
      featureKeys: new Set(["OVERVIEW", "SETTINGS"] as FeatureKey[]),
    }));
    setSavedFlash(false);
  }

  async function save(keepOpen = true) {
    setSaving(true);
    setError("");
    setSavedFlash(false);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      currency: form.currency || "GHS",
      guestLimit: parseInt(form.guestLimit, 10) || 0,
      invitationLimit: parseInt(form.invitationLimit, 10) || 0,
      ticketLimit: parseInt(form.ticketLimit, 10) || 0,
      smsCredits: parseInt(form.smsCredits, 10) || 0,
      whatsappCredits: parseInt(form.whatsappCredits, 10) || 0,
      emailCredits: parseInt(form.emailCredits, 10) || 0,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      isActive: form.isActive,
      features: Array.from(form.featureKeys),
    };

    try {
      const res =
        editingId && !creating
          ? await fetch("/api/admin/packages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: editingId, ...payload }),
            })
          : await fetch("/api/admin/packages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }

      await reload();

      if (creating && data.data?.id) {
        setCreating(false);
        setEditingId(data.data.id);
        setForm(toForm(serializePackage(data.data)));
      } else if (data.data) {
        setForm(toForm(serializePackage(data.data)));
      }

      setSavedFlash(true);
      if (!keepOpen) closeEditor();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete or deactivate package "${name}"? Linked events keep the package deactivated instead.`)) {
      return;
    }
    await fetch(`/api/admin/packages?id=${id}`, { method: "DELETE" });
    if (editingId === id) closeEditor();
    await reload();
  }

  async function toggleActive(pkg: PackageRow) {
    await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
    });
    await reload();
  }

  const filteredGroups = useMemo(() => {
    const q = featureFilter.trim().toLowerCase();
    if (!q) return FEATURE_GROUPS;
    return FEATURE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [featureFilter]);

  const selectedCount = form.featureKeys.size;
  const editorOpen = creating || editingId != null;

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Event Packages"
        subtitle="Set prices, limits, credits, and which features/services each package unlocks — edit freely without leaving the page."
        count={total}
        onRefresh={() => void reload()}
        onAdd={startCreate}
        addLabel="Add Package"
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {packages.map((pkg) => {
          const keys = resolveFeatureKeys(pkg);
          const isSelected = editingId === pkg.id;
          return (
            <Card
              key={pkg.id}
              className={`${!pkg.isActive ? "opacity-60" : ""} ${
                isSelected ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  <Badge variant={pkg.isActive ? "success" : "destructive"}>
                    {pkg.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-2xl font-bold">
                  {Number(pkg.price) === 0
                    ? "Free"
                    : formatCurrency(pkg.price, pkg.currency)}
                </p>
                <p className="text-slate-500">
                  {pkg.guestLimit} guests · {pkg.invitationLimit} invites · {pkg.ticketLimit} tickets
                </p>
                <p className="text-slate-500">
                  {pkg.smsCredits} SMS · {pkg.whatsappCredits} WhatsApp · {pkg.emailCredits} email
                </p>
                <p className="text-xs text-slate-500">
                  {keys.length} features · {pkg._count?.events ?? 0} events
                </p>
                {keys.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {keys.slice(0, 4).map((k) => (
                      <Badge key={k} variant="outline" className="text-[10px] font-normal">
                        {featureLabel(k)}
                      </Badge>
                    ))}
                    {keys.length > 4 && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        +{keys.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => startEdit(pkg)}>
                    <Pencil className="h-3 w-3" />
                    {isSelected ? "Editing" : "Edit"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void toggleActive(pkg)}>
                    {pkg.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => void remove(pkg.id, pkg.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PaginationBar
        page={page}
        pages={pages}
        total={total}
        limit={ADMIN_TABLE_LIMIT}
        onPageChange={setPage}
      />

      {editorOpen && (
        <Card className="border-brand-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {creating ? (
                  <>
                    <Plus className="h-4 w-4 text-brand-600" /> New package
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 text-brand-600" /> Edit {editingPkg?.name ?? "package"}
                  </>
                )}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Change price, quotas, and feature access. Saving keeps this editor open so you can keep tuning.
              </p>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={closeEditor} aria-label="Close editor">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {savedFlash && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check className="h-4 w-4" /> Saved. Editor stays open — keep editing anytime.
              </p>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from name"
                />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                  <Label className="cursor-pointer">Active & sellable</Label>
                </div>
              </div>
              <div>
                <Label>Guest limit</Label>
                <Input
                  type="number"
                  value={form.guestLimit}
                  onChange={(e) => setForm({ ...form, guestLimit: e.target.value })}
                />
              </div>
              <div>
                <Label>Invitation limit</Label>
                <Input
                  type="number"
                  value={form.invitationLimit}
                  onChange={(e) => setForm({ ...form, invitationLimit: e.target.value })}
                />
              </div>
              <div>
                <Label>Ticket limit</Label>
                <Input
                  type="number"
                  value={form.ticketLimit}
                  onChange={(e) => setForm({ ...form, ticketLimit: e.target.value })}
                />
              </div>
              <div>
                <Label>SMS credits</Label>
                <Input
                  type="number"
                  value={form.smsCredits}
                  onChange={(e) => setForm({ ...form, smsCredits: e.target.value })}
                />
              </div>
              <div>
                <Label>WhatsApp credits</Label>
                <Input
                  type="number"
                  value={form.whatsappCredits}
                  onChange={(e) => setForm({ ...form, whatsappCredits: e.target.value })}
                />
              </div>
              <div>
                <Label>Email credits</Label>
                <Input
                  type="number"
                  value={form.emailCredits}
                  onChange={(e) => setForm({ ...form, emailCredits: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Features & services ({selectedCount})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Toggle modules included for events on this package. Access updates immediately after save.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="h-8 w-40"
                    placeholder="Filter features…"
                    value={featureFilter}
                    onChange={(e) => setFeatureFilter(e.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={selectAllFeatures}>
                    Select all
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={clearFeatures}>
                    Core only
                  </Button>
                </div>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {filteredGroups.map(({ group, items }) => (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      {group}
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map((f) => {
                        const on = form.featureKeys.has(f.key);
                        return (
                          <label
                            key={f.key}
                            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                              on
                                ? "border-brand-300 bg-white shadow-sm"
                                : "border-slate-200 bg-white/70 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-brand-600"
                              checked={on}
                              onChange={() => toggleFeature(f.key)}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-800">
                                {f.label}
                              </span>
                              {f.description && (
                                <span className="block text-xs text-slate-500">{f.description}</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sticky bottom-0 bg-white/95 backdrop-blur py-2 border-t border-slate-100 -mx-1 px-1">
              <Button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={() => void save(true)}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {creating ? "Create package" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={closeEditor}>
                Close editor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
