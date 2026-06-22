"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2 } from "lucide-react";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { AgiBadge } from "@/components/agi-engine/agi-badge";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface InspirationUploadPanelProps {
  orderId: string;
}

export function InspirationUploadPanel({ orderId }: InspirationUploadPanelProps) {
  const [type, setType] = useState<"image" | "flyer" | "poster" | "video">("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ concept?: string; colors?: string[] } | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function analyzeWithUrl(url: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/invitation-os/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        url,
        type: type === "video" ? "video" : "image",
        name: `Inspiration ${type}`,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (d.success) {
      setResult({
        concept: d.data.asset?.concept,
        colors: d.data.asset?.colorPalette,
      });
    } else {
      setError(d.error || "Analysis failed");
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[#0B8A83]" />
          Inspiration Upload
        </CardTitle>
        <p className="text-xs text-slate-500">
          Import from your device, crop to frame, then {AGI_COPY.analyzing.toLowerCase()}
        </p>
        <AgiBadge variant="inline" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="image">Invitation image</option>
            <option value="flyer">Flyer</option>
            <option value="poster">Poster</option>
          </select>
        </div>

        <ImageUploadCropper
          defaultAspect="3:4"
          allowedAspects={CROP_PRESETS.gallery}
          extraFormFields={{ role: "inspiration", buildMode: "inspired" }}
          previewUrl={uploadedUrl}
          onClear={() => setUploadedUrl(null)}
          buttonLabel="Import & crop image"
          hint="Upload a sample design from your phone or computer."
          onUploaded={async (r) => {
            setUploadedUrl(r.url);
            await analyzeWithUrl(r.url);
          }}
          onError={setError}
        />

        {loading && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> {AGI_COPY.optimizing}
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

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

        {uploadedUrl && !loading && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => void analyzeWithUrl(uploadedUrl)}>
            Re-analyze
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
