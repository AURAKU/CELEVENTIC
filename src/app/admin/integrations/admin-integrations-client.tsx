"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plug, Trash2, Pencil, Zap, ExternalLink, Copy, Check, Key, Globe,
  Webhook, Shield, AlertCircle,
} from "lucide-react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminQrBrandingCard } from "@/components/admin/admin-qr-branding-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INTEGRATION_CATEGORIES, type IntegrationCatalogEntry } from "@/lib/integrations/integration-catalog";

interface IntegrationRow {
  id: string;
  provider: string;
  label: string;
  category: string;
  description: string | null;
  isEnabled: boolean;
  hasSecret: boolean;
  hasEnvFallback: boolean;
  publicKey: string | null;
  webhookUrl: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
  docsUrl: string | null;
  webhookPath: string | null;
}

const EMPTY_FORM = {
  label: "",
  category: "custom",
  description: "",
  secret: "",
  publicKey: "",
  webhookUrl: "",
  isEnabled: false,
};

export function AdminIntegrationsClient() {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [catalog, setCatalog] = useState<IntegrationCatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"catalog" | "custom">("catalog");
  const [addCatalogProvider, setAddCatalogProvider] = useState("");
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/integrations");
    const d = await res.json();
    if (d.success) {
      setIntegrations(d.data.integrations);
      setCatalog(d.data.catalog);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = integrations.find((i) => i.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      const matchCat = category === "all" || i.category === category;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        i.label.toLowerCase().includes(q) ||
        i.provider.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false);
      return matchCat && matchSearch;
    });
  }, [integrations, category, search]);

  const availableCatalog = useMemo(() => {
    const existing = new Set(integrations.map((i) => i.provider));
    return catalog.filter((c) => !existing.has(c.provider));
  }, [catalog, integrations]);

  function openEdit(row: IntegrationRow) {
    setSelectedId(row.id);
    setEditForm({
      label: row.label,
      category: row.category,
      description: row.description ?? "",
      secret: "",
      publicKey: row.publicKey ?? "",
      webhookUrl: row.webhookUrl ?? "",
      isEnabled: row.isEnabled,
    });
    setTestResult(null);
    setError("");
  }

  async function saveEdit() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/integrations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editForm.label,
        category: editForm.category,
        description: editForm.description,
        secret: editForm.secret || undefined,
        publicKey: editForm.publicKey,
        webhookUrl: editForm.webhookUrl,
        isEnabled: editForm.isEnabled,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.success) {
      setError(d.error || "Save failed");
      return;
    }
    setEditForm((f) => ({ ...f, secret: "" }));
    await load();
    setSelectedId(d.data.id);
  }

  async function toggleEnabled(row: IntegrationRow) {
    await fetch(`/api/admin/integrations/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !row.isEnabled }),
    });
    load();
  }

  async function removeIntegration(row: IntegrationRow) {
    if (!row.isCustom) {
      setError("Built-in integrations cannot be deleted. Disable them instead.");
      return;
    }
    if (!confirm(`Delete integration "${row.label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/integrations/${row.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.success) {
      setError(d.error || "Delete failed");
      return;
    }
    if (selectedId === row.id) setSelectedId(null);
    load();
  }

  async function clearSecret() {
    if (!selectedId || !confirm("Remove stored API secret? Env fallback will be used if configured.")) return;
    await fetch(`/api/admin/integrations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearSecret: true }),
    });
    load();
  }

  async function testConnection() {
    if (!selectedId) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch(`/api/admin/integrations/${selectedId}/test`, { method: "POST" });
    const d = await res.json();
    setTesting(false);
    if (d.success) setTestResult(d.data);
    else setTestResult({ ok: false, message: d.error || "Test failed" });
    load();
  }

  async function createIntegration(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload =
      addMode === "catalog"
        ? { fromCatalog: addCatalogProvider, isEnabled: addForm.isEnabled }
        : {
            label: addForm.label,
            category: addForm.category,
            description: addForm.description,
            secret: addForm.secret || undefined,
            publicKey: addForm.publicKey || undefined,
            webhookUrl: addForm.webhookUrl || undefined,
            isEnabled: addForm.isEnabled,
          };

    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.success) {
      setError(d.error || "Create failed");
      return;
    }
    setShowAdd(false);
    setAddForm({ ...EMPTY_FORM });
    setAddCatalogProvider("");
    await load();
    openEdit(d.data);
  }

  function copyWebhook(path: string | null) {
    if (!path) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const enabledCount = integrations.filter((i) => i.isEnabled).length;

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Integrations & API Hub"
        subtitle="Connect, configure, enable, and test every third-party service. Secrets are encrypted at rest."
        count={integrations.length}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
        onAdd={() => { setShowAdd(!showAdd); setError(""); }}
        addLabel="Add Integration"
      >
        <Badge variant="success">{enabledCount} active</Badge>
      </AdminToolbar>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showAdd && (
        <Card className="border-brand-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4 text-brand-600" />
              Add Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                size="sm"
                variant={addMode === "catalog" ? "default" : "outline"}
                onClick={() => setAddMode("catalog")}
              >
                From catalog
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addMode === "custom" ? "default" : "outline"}
                onClick={() => setAddMode("custom")}
              >
                Custom API
              </Button>
            </div>
            <form onSubmit={createIntegration} className="space-y-4">
              {addMode === "catalog" ? (
                <div>
                  <Label>Provider</Label>
                  <Select value={addCatalogProvider} onValueChange={setAddCatalogProvider} required>
                    <SelectTrigger><SelectValue placeholder="Select provider..." /></SelectTrigger>
                    <SelectContent>
                      {availableCatalog.map((c) => (
                        <SelectItem key={c.provider} value={c.provider}>
                          {c.label} — {c.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableCatalog.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">All catalog providers are already added.</p>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={addForm.label}
                      onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                      placeholder="My Webhook API"
                      required
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={addForm.category}
                      onValueChange={(v) => setAddForm({ ...addForm, category: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTEGRATION_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>API Secret / Key</Label>
                    <Input
                      type="password"
                      value={addForm.secret}
                      onChange={(e) => setAddForm({ ...addForm, secret: e.target.value })}
                      placeholder="Optional — encrypted when saved"
                    />
                  </div>
                  <div>
                    <Label>Public Key / Client ID</Label>
                    <Input
                      value={addForm.publicKey}
                      onChange={(e) => setAddForm({ ...addForm, publicKey: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={addForm.isEnabled}
                  onCheckedChange={(v) => setAddForm({ ...addForm, isEnabled: v })}
                />
                <Label>Enable immediately</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || (addMode === "catalog" && !addCatalogProvider)}>
                  {saving ? "Adding..." : "Add Integration"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">All</TabsTrigger>
              {INTEGRATION_CATEGORIES.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>{c.label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={category} className="mt-4">
              {loading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading integrations...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No integrations match your filters.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {filtered.map((row) => (
                    <Card
                      key={row.id}
                      className={`cursor-pointer transition-all hover:border-brand-300 ${
                        selectedId === row.id ? "ring-2 ring-brand-500 border-brand-300" : ""
                      }`}
                      onClick={() => openEdit(row)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-semibold truncate">{row.label}</CardTitle>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.provider}</p>
                          </div>
                          <Badge variant={row.isEnabled ? "success" : "outline"}>
                            {row.isEnabled ? "On" : "Off"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-slate-500 line-clamp-2">{row.description}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px]">{row.category}</Badge>
                          {row.hasSecret && <Badge variant="success" className="text-[10px]">Key stored</Badge>}
                          {row.hasEnvFallback && <Badge variant="warning" className="text-[10px]">Env fallback</Badge>}
                          {row.isCustom && <Badge variant="outline" className="text-[10px]">Custom</Badge>}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(row)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => toggleEnabled(row)}
                          >
                            {row.isEnabled ? "Disable" : "Enable"}
                          </Button>
                          {row.isCustom && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-red-600 hover:text-red-700"
                              onClick={() => removeIntegration(row)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card className="sticky top-4 border-brand-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4 text-brand-600" />
                  Configure {selected.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div>
                    <Label>Display name</Label>
                    <Input
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(v) => setEditForm({ ...editForm, category: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTEGRATION_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      API Secret / Key
                      {selected.hasSecret && (
                        <Badge variant="success" className="ml-1 text-[10px]">configured</Badge>
                      )}
                    </Label>
                    <Input
                      type="password"
                      value={editForm.secret}
                      onChange={(e) => setEditForm({ ...editForm, secret: e.target.value })}
                      placeholder={selected.hasSecret ? "Leave blank to keep current" : "Enter secret key"}
                    />
                    {selected.hasSecret && (
                      <Button type="button" variant="ghost" size="sm" className="mt-1 text-xs text-red-600" onClick={clearSecret}>
                        Remove stored secret
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public Key / Client ID</Label>
                    <Input
                      value={editForm.publicKey}
                      onChange={(e) => setEditForm({ ...editForm, publicKey: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Webhook className="h-3 w-3" /> Webhook URL (outbound)</Label>
                    <Input
                      value={editForm.webhookUrl}
                      onChange={(e) => setEditForm({ ...editForm, webhookUrl: e.target.value })}
                      placeholder="https://your-service.com/webhook"
                    />
                  </div>
                  {selected.webhookPath && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <p className="text-xs font-medium text-slate-700 mb-1">Inbound webhook endpoint</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-brand-700 flex-1 truncate">{selected.webhookPath}</code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0"
                          onClick={() => copyWebhook(selected.webhookPath)}
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium">Enabled</p>
                      <p className="text-xs text-slate-500">Use this integration in production flows</p>
                    </div>
                    <Switch
                      checked={editForm.isEnabled}
                      onCheckedChange={(v) => setEditForm({ ...editForm, isEnabled: v })}
                    />
                  </div>
                </div>

                {testResult && (
                  <div className={`rounded-lg p-3 text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {testResult.message}
                  </div>
                )}

                {(selected.config as { lastTestedAt?: string; lastTestMessage?: string }).lastTestedAt && !testResult && (
                  <p className="text-xs text-slate-500">
                    Last tested: {new Date((selected.config as { lastTestedAt: string }).lastTestedAt).toLocaleString()}
                    {(selected.config as { lastTestMessage?: string }).lastTestMessage && (
                      <> — {(selected.config as { lastTestMessage: string }).lastTestMessage}</>
                    )}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button variant="outline" onClick={testConnection} disabled={testing}>
                    <Zap className="h-4 w-4" />
                    {testing ? "Testing..." : "Test connection"}
                  </Button>
                  {selected.docsUrl && (
                    <Button variant="outline" asChild>
                      <a href={selected.docsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> Docs
                      </a>
                    </Button>
                  )}
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Secrets are AES-256 encrypted. Env variables still work as fallback when no DB secret is set.
                    {!selected.isCustom && " Built-in providers cannot be deleted."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-slate-500">
                <Plug className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                Select an integration to configure API keys, webhooks, and enable/disable services.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AdminQrBrandingCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System management quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { href: "/admin/services", label: "Platform Services" },
            { href: "/admin/modules", label: "EventOS Modules" },
            { href: "/admin/payments", label: "Payment Logs" },
            { href: "/admin/security", label: "Security" },
            { href: "/admin/audit-logs", label: "Audit Logs" },
            { href: "/admin/contact", label: "Contact Settings" },
            { href: "/admin/translations", label: "Languages" },
            { href: "/admin/commerce", label: "Commerce" },
          ].map((link) => (
            <Button key={link.href} variant="outline" size="sm" asChild className="justify-start">
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
