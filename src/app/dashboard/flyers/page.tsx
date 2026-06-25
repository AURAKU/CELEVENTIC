"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

interface Design { id: string; name: string; type: string; status: string }
interface Template { id: string; name: string; type: string }

export default function FlyerStudioPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState({ name: "", type: "FLYER" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/flyers").then((r) => r.json()).then((d) => {
      if (d.success) {
        setDesigns(d.data.designs);
        setTemplates(d.data.templates);
      }
    });
  }, []);

  async function createDesign(payload: { name: string; type: string; config?: Record<string, unknown> }) {
    setCreating(true);
    setError("");
    const res = await fetch("/api/flyers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, eventId: eventId || undefined }),
    });
    const d = await res.json();
    setCreating(false);
    if (res.ok) {
      setDesigns((prev) => [d.data, ...prev]);
      setForm({ name: "", type: "FLYER" });
      return d.data as Design;
    }
    setError(d.error || "Failed to create design");
    return null;
  }

  async function createDesignFromForm(e: React.FormEvent) {
    e.preventDefault();
    await createDesign(form);
  }

  async function createFromTemplate(template: Template) {
    await createDesign({
      name: `${template.name} Flyer`,
      type: template.type,
      config: { templateId: template.id },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Flyer Studio</h1>
        <p className="page-subtitle">Create flyers, posters, banners, and social media creatives.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} label="Link to Event (optional)" />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> New Design</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createDesignFromForm} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1">
                <Label>Type</Label>
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
                {creating ? "Creating…" : "Create Design"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> My Designs</CardTitle></CardHeader>
          <CardContent>
            {designs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No designs yet. Create your first flyer or poster.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {designs.map((d) => (
                  <div key={d.id} className="p-4 rounded-lg border">
                    <p className="font-medium">{d.name}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{d.type}</Badge>
                      <Badge variant={d.status === "PUBLISHED" ? "success" : "warning"}>{d.status}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                      Saved in Flyer Studio
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={creating}
                onClick={() => void createFromTemplate(t)}
                className="p-4 rounded-lg border text-center hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer transition-colors disabled:opacity-50"
              >
                <div className="h-16 rounded bg-gradient-to-br from-teal-100 to-gold-100 mb-2" />
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-slate-500 mt-1">Click to use</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
