"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Image,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Upload,
  Sparkles,
  Wand2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { cn } from "@/lib/utils";

interface Design {
  id: string;
  name: string;
  type: string;
  status: string;
  config?: { designTemplateId?: string; templateId?: string } | null;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  gradient?: string;
}

export function FlyerStudioClient() {
  const router = useRouter();
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState({ name: "", type: "FLYER" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadDesigns() {
    const qs = eventId ? `?eventId=${eventId}` : "";
    const res = await fetch(`/api/flyers${qs}`);
    const d = await res.json();
    if (d.success) {
      setDesigns(d.data.designs);
      setTemplates(d.data.templates);
    }
  }

  useEffect(() => {
    void loadDesigns();
  }, [eventId]);

  function exportUrl(design: Design) {
    const templateId = design.config?.designTemplateId;
    if (templateId) return `/dashboard/design-studio/builder/${templateId}`;
    return "/dashboard/design-studio/generated";
  }

  async function createDesign(payload: {
    name: string;
    type: string;
    templateId?: string;
    config?: Record<string, unknown>;
  }) {
    setCreating(true);
    setError("");
    const res = await fetch("/api/flyers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        type: payload.type,
        templateId: payload.templateId,
        config: payload.config,
        eventId: eventId || undefined,
      }),
    });
    const d = await res.json();
    setCreating(false);
    if (res.ok) {
      setForm({ name: "", type: "FLYER" });
      await loadDesigns();
      const design = d.data?.design ?? d.data;
      const templateId = d.data?.designTemplateId ?? design?.config?.designTemplateId;
      if (templateId) {
        router.push(`/dashboard/design-studio/builder/${templateId}`);
      }
      return design as Design;
    }
    setError(d.error || "Failed to create design");
    return null;
  }

  async function createFromForm(e: React.FormEvent) {
    e.preventDefault();
    await createDesign(form);
  }

  async function createFromTemplate(template: Template) {
    await createDesign({
      name: `${template.name}`,
      type: template.type,
      templateId: template.id,
    });
  }

  async function designAction(id: string, action: "publish" | "duplicate" | "delete") {
    setBusyId(id);
    setError("");
    if (action === "delete") {
      if (!confirm("Delete this design?")) {
        setBusyId(null);
        return;
      }
      const res = await fetch(`/api/flyers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Delete failed");
      }
    } else {
      const res = await fetch(`/api/flyers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Action failed");
      }
    }
    setBusyId(null);
    await loadDesigns();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Flyer Studio</h1>
          <p className="page-subtitle">
            Professional flyers, posters, banners, and social creatives — drag-and-drop editor, templates, and export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/design-studio"><Sparkles className="h-4 w-4 mr-1" /> Design Studio</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/design-studio/ai"><Wand2 className="h-4 w-4 mr-1" /> AI Generator</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/design-studio/generated"><Upload className="h-4 w-4 mr-1" /> Exports</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} label="Link to event (auto-fills title, date, venue)" />
          {eventId && (
            <p className="text-xs text-slate-500 mt-2">
              Showing designs linked to this event. New designs will auto-fill event details.
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Blank design</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createFromForm} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Summer Concert Flyer" /></div>
              <div className="space-y-1">
                <Label>Format</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["FLYER", "POSTER", "BANNER", "SOCIAL_MEDIA"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</> : "Create & open editor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> My designs</CardTitle></CardHeader>
          <CardContent>
            {designs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No designs yet. Pick a template below or start blank.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {designs.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline">{d.type.replace(/_/g, " ")}</Badge>
                          <Badge variant={d.status === "PUBLISHED" ? "success" : "warning"}>{d.status}</Badge>
                        </div>
                      </div>
                      {busyId === d.id && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button size="sm" className="gap-1" asChild>
                        <Link href={exportUrl(d)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" asChild>
                        <Link href={exportUrl(d)}>
                          <ExternalLink className="h-3.5 w-3.5" /> Open in editor
                        </Link>
                      </Button>
                      {d.status !== "PUBLISHED" && (
                        <Button size="sm" variant="outline" onClick={() => void designAction(d.id, "publish")}>Publish</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void designAction(d.id, "duplicate")}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 col-span-2" onClick={() => void designAction(d.id, "delete")}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template library</CardTitle>
          <p className="text-sm text-slate-500">Each template opens in the full drag-and-drop Design Studio editor.</p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={creating}
                onClick={() => void createFromTemplate(t)}
                className={cn(
                  "rounded-xl border p-4 text-left hover:border-[#0B8A83] hover:shadow-md transition-all disabled:opacity-50",
                  "bg-white"
                )}
              >
                <div className={cn("h-20 rounded-lg mb-3 bg-gradient-to-br", t.gradient ?? "from-teal-100 to-gold-100")} />
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500 mt-1">{t.description ?? t.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-[#0B8A83] font-medium mt-2">Use template →</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
