"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus } from "lucide-react";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { AgiBadge } from "@/components/agi-engine/agi-badge";

interface InspirationUploadPanelProps {
  orderId: string;
}

export function InspirationUploadPanel({ orderId }: InspirationUploadPanelProps) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"image" | "flyer" | "poster" | "video">("image");

  function apiType(): "image" | "video" | "pdf" {
    if (type === "video") return "video";
    return "image";
  }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ concept?: string; colors?: string[] } | null>(null);

  async function analyze() {
    if (!url.trim()) return;
    setLoading(true);
    const res = await fetch("/api/invitation-os/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, url, type: apiType(), name: `Inspiration ${type}` }),
    });
    const d = await res.json();
    setLoading(false);
    if (d.success) {
      setResult({
        concept: d.data.asset?.concept,
        colors: d.data.asset?.colorPalette,
      });
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[#0B8A83]" />
          Inspiration Upload
        </CardTitle>
        <p className="text-xs text-slate-500">Paste a link to an image, flyer, poster, or short video for {AGI_COPY.analyzing.toLowerCase()}</p>
        <AgiBadge variant="inline" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Media URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="image">Invitation image</option>
            <option value="flyer">Flyer</option>
            <option value="poster">Poster</option>
            <option value="video">Short video</option>
          </select>
        </div>
        <Button onClick={analyze} disabled={loading || !url.trim()} variant="outline" className="w-full">
          {loading ? AGI_COPY.optimizing : "Analyze & Save Inspiration"}
        </Button>
        {result && (
          <div className="rounded-lg bg-[#0B8A83]/5 p-3 text-xs space-y-1">
            {result.concept && <p><strong>Mood:</strong> {result.concept}</p>}
            {result.colors && result.colors.length > 0 && (
              <div className="flex gap-1 mt-2">
                {result.colors.map((c) => (
                  <span key={c} className="w-6 h-6 rounded-full border" style={{ background: c }} title={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
