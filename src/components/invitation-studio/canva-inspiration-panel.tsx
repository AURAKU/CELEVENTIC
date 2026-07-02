"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Upload, Link2, Loader2, Shield, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CANVA_CONSENT_TEXT,
  CANVA_EXPORT_ACCEPT,
  CANVA_INSPIRATION_CATEGORIES,
  isCanvaShareUrl,
} from "@/lib/inspiration/canva-inspiration";
import { extractImagePalette } from "@/lib/extract-image-palette";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";

interface CanvaInspirationPanelProps {
  eventId?: string;
  onGenerated?: (projectUrl: string) => void;
}

export function CanvaInspirationPanel({ eventId, onGenerated }: CanvaInspirationPanelProps) {
  const [consent, setConsent] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(CANVA_INSPIRATION_CATEGORIES[0].id);
  const [canvaUrl, setCanvaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const pollUntilReady = useCallback(async (sourceId: string) => {
    for (let i = 0; i < 40; i++) {
      const res = await fetch(`/api/inspiration/${sourceId}`);
      const d = await res.json();
      if (!d.success) break;
      setStatus(d.data.status);
      if (["READY", "GENERATED"].includes(d.data.status)) {
        const genRes = await fetch("/api/inspiration/generate-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, outputType: CANVA_INSPIRATION_CATEGORIES.find((c) => c.id === categoryId)?.outputType }),
        });
        const gen = await genRes.json();
        if (gen.success && gen.data?.studioProjectId) {
          const url = `/dashboard/design-studio/builder/${gen.data.studioProjectId}`;
          onGenerated?.(url);
          return url;
        }
        if (gen.success && gen.data?.designTemplateId) {
          const url = `/dashboard/design-studio/builder/${gen.data.designTemplateId}`;
          onGenerated?.(url);
          return url;
        }
        return null;
      }
      if (["FAILED", "BLOCKED"].includes(d.data.status)) {
        throw new Error(d.data.blockedReason ?? "Inspiration analysis failed");
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
  }, [categoryId, onGenerated]);

  async function handleCanvaLink(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError(CANVA_CONSENT_TEXT);
      return;
    }
    if (!isCanvaShareUrl(canvaUrl)) {
      setError("Paste a valid Canva share link (canva.com/design/…). We analyze layout concept only — no assets are copied.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inspiration/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: canvaUrl,
          eventId,
          consentConfirmed: true,
          canvaShareConfirmed: true,
          categoryId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Analysis failed");
      setCanvaUrl("");
      setStatus(d.data.status);
      await pollUntilReady(d.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze Canva link");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportUpload(file: File) {
    if (!consent) {
      setError(CANVA_CONSENT_TEXT);
      return;
    }
    if (!(file.type in CANVA_EXPORT_ACCEPT)) {
      setError("Upload PNG, JPG, PDF, MP4, or SVG from your Canva export.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("consentConfirmed", "true");
      if (eventId) form.set("eventId", eventId);
      if (file.type.startsWith("image/")) {
        try {
          const palette = await extractImagePalette(URL.createObjectURL(file));
          form.set("colors", JSON.stringify(palette.colors));
          form.set("brightness", String(palette.brightness));
          form.set("aspectRatio", String(palette.aspectRatio));
        } catch {
          /* optional palette */
        }
      }
      const result = await uploadFormDataWithProgress("/api/inspiration/upload", form);
      if (!result.ok) throw new Error((result.json as { error?: string }).error ?? "Upload failed");
      const payload = result.json as { data: { id: string; status: string } };
      setStatus(payload.data.status);
      await pollUntilReady(payload.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-violet-50 to-teal-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
            <Sparkles className="h-4 w-4 text-violet-600" /> Canva Inspiration
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Import your Canva export or share link. Celeventic generates an original editable template — we never copy protected assets.
          </p>
        </div>
        <Link href="/dashboard/inspiration" className="text-xs text-[#0B8A83] hover:underline flex items-center gap-1 shrink-0">
          Full studio <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1">
        <Label>Template category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {CANVA_INSPIRATION_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer rounded-lg border border-violet-200 bg-white/80 p-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 rounded border-slate-300"
        />
        <span className="flex items-start gap-1.5">
          <Shield className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          {CANVA_CONSENT_TEXT}
        </span>
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-violet-200 bg-white/90 cursor-pointer hover:border-violet-400 transition-colors min-h-[120px]">
          <Upload className="h-6 w-6 text-violet-600" />
          <span className="text-sm font-medium text-slate-800">Upload Canva export</span>
          <span className="text-[10px] text-slate-500 text-center">PNG · JPG · PDF · MP4 · SVG</span>
          <input
            type="file"
            accept={Object.keys(CANVA_EXPORT_ACCEPT).join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleExportUpload(f);
            }}
          />
        </label>

        <form onSubmit={(e) => void handleCanvaLink(e)} className="flex flex-col gap-2 p-4 rounded-xl border border-violet-200 bg-white/90">
          <Label className="flex items-center gap-1.5 text-sm">
            <Link2 className="h-4 w-4 text-violet-600" /> Paste Canva share link
          </Label>
          <Input
            value={canvaUrl}
            onChange={(e) => setCanvaUrl(e.target.value)}
            placeholder="https://www.canva.com/design/…"
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy || !canvaUrl.trim()} className="bg-violet-700 hover:bg-violet-800">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze concept"}
          </Button>
        </form>
      </div>

      {status && <p className="text-xs text-[#0B8A83] font-medium">Status: {status.replace(/_/g, " ")}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {busy && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building your editable Celeventic template…
        </p>
      )}
    </section>
  );
}
