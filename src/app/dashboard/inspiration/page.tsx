"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { INSPIRATION_UPGRADES } from "@/lib/constants";

interface UploadRecord {
  id: string;
  type: string;
  url: string;
  status: string;
  analysis?: { colors?: string[]; style?: string };
  upgradeStyle?: string;
}

export default function InspirationPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [form, setForm] = useState({ url: "", type: "IMAGE" });
  const [selectedId, setSelectedId] = useState("");
  const [upgradeStyle, setUpgradeStyle] = useState("INSPIRED");

  useEffect(() => {
    fetch("/api/inspiration").then((r) => r.json()).then((d) => {
      if (d.success) setUploads(d.data);
    });
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const d = await res.json();
      setUploads([d.data, ...uploads]);
    }
  }

  async function handleGenerate() {
    const res = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", uploadId: selectedId, upgradeStyle }),
    });
    if (res.ok) {
      const d = await res.json();
      setUploads(uploads.map((u) => (u.id === selectedId ? d.data : u)));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inspiration Upload Engine</h1>
        <p className="page-subtitle">Upload designs and generate AI-powered style upgrades.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Upload</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-3">
              <div className="space-y-1"><Label>Media URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." required /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["IMAGE", "FLYER", "INVITATION", "BUSINESS_CARD", "VIDEO"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Upload & Analyze</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Uploads</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {uploads.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Upload an invitation, flyer, or video to get started.</p>
            ) : uploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{u.type}</p>
                  {u.analysis && (
                    <p className="text-xs page-subtitle">
                      Colors: {u.analysis.colors?.join(", ")} · Style: {u.analysis.style}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.status === "GENERATED" ? "success" : "outline"}>{u.status}</Badge>
                  {u.status === "READY" && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(u.id)}>Select</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedId && (
        <Card className="border-brand-200">
          <CardContent className="p-6 flex flex-wrap items-end gap-4">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label>Upgrade Style</Label>
              <Select value={upgradeStyle} onValueChange={setUpgradeStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPIRATION_UPGRADES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate}><Sparkles className="h-4 w-4" /> Generate Design</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
