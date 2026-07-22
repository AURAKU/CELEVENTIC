"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2 } from "lucide-react";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { AgiBadge } from "@/components/agi-engine/agi-badge";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import {
  smartCompressImage,
  extensionForBlob,
  formatBytes,
  INSPIRATION_IMAGE_COMPRESSION,
} from "@/lib/image/smart-compress";
import { extractImagePalette } from "@/lib/extract-image-palette";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";

interface InspirationUploadPanelProps {
  orderId: string;
}

interface PaletteMeta {
  colors: { hex: string; weight: number }[];
  brightness: number;
  aspectRatio: number;
}

function paletteSwatches(colorPalette: unknown): string[] | undefined {
  if (!colorPalette || typeof colorPalette !== "object") return undefined;
  const values = Object.values(colorPalette as Record<string, unknown>).filter(
    (v): v is string => typeof v === "string" && v.startsWith("#")
  );
  return values.length ? values : undefined;
}

export function InspirationUploadPanel({ orderId }: InspirationUploadPanelProps) {
  const [type, setType] = useState<"image" | "flyer" | "poster">("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ concept?: string; colors?: string[] } | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteMeta | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pendingPalette = useRef<PaletteMeta | null>(null);

  async function analyzeWithUrl(url: string, meta?: PaletteMeta | null) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/invitation-os/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        url,
        type: "image",
        name: `Inspiration ${type}`,
        buildMode: "inspired",
        colors: meta?.colors,
        brightness: meta?.brightness,
        aspectRatio: meta?.aspectRatio,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (d.success) {
      const concept = d.data.asset?.concept;
      setResult({
        concept:
          typeof concept === "string"
            ? concept
            : concept?.mood ?? concept?.style ?? undefined,
        colors: paletteSwatches(d.data.asset?.colorPalette),
      });
    } else {
      setError(d.error || "Analysis failed");
    }
  }

  async function uploadCropped(blob: Blob, name: string) {
    setError("");
    setNotice("");
    const compressed = await smartCompressImage(blob, INSPIRATION_IMAGE_COMPRESSION);
    const finalName = name.replace(/\.[^.]+$/, "") + "." + extensionForBlob(compressed.blob);
    const file = new File([compressed.blob], finalName, {
      type: compressed.blob.type || "image/jpeg",
    });

    let meta: PaletteMeta | null = null;
    const preview = URL.createObjectURL(compressed.blob);
    try {
      const extracted = await extractImagePalette(preview);
      meta = {
        colors: extracted.colors,
        brightness: extracted.brightness,
        aspectRatio: extracted.aspectRatio,
      };
    } catch {
      meta = null;
    } finally {
      URL.revokeObjectURL(preview);
    }

    pendingPalette.current = meta;
    setPalette(meta);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", "inspiration");
    fd.append("buildMode", "inspired");
    if (meta) {
      fd.append("colors", JSON.stringify(meta.colors));
      fd.append("brightness", String(meta.brightness));
      fd.append("aspectRatio", String(meta.aspectRatio));
    }

    const { ok, json } = await uploadFormDataWithProgress("/api/invitations/upload", fd);
    if (!ok) {
      throw new Error((json.error as string) || "Upload failed");
    }
    const data = json.data as { url: string; name?: string };

    if (!compressed.untouched) {
      setNotice(
        `Optimised ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.blob.size)} ` +
          `at ${compressed.width}×${compressed.height}`
      );
    }

    return { url: data.url, name: data.name ?? finalName };
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[#0B8A83]" />
          Inspiration Upload
        </CardTitle>
        <p className="text-xs text-slate-500">
          Import from your device, crop to frame, then analyze your design inspiration
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
          defaultAspect="free"
          allowedAspects={CROP_PRESETS.inspiration}
          previewUrl={uploadedUrl}
          onClear={() => {
            setUploadedUrl(null);
            setResult(null);
            setPalette(null);
            pendingPalette.current = null;
            setNotice("");
          }}
          buttonLabel="Import & crop image"
          hint="Upload a sample design from your phone or computer."
          maxFileBytes={Infinity}
          dropzoneNote="or drag & drop · JPEG, PNG, WebP · any size · auto-optimised"
          onCustomUpload={uploadCropped}
          onUploaded={async (r) => {
            setUploadedUrl(r.url);
            await analyzeWithUrl(r.url, pendingPalette.current ?? palette);
          }}
          onError={setError}
        />

        {notice && <p className="text-[11px] text-emerald-700">{notice}</p>}

        {loading && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> {AGI_COPY.optimizing}
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {result && (
          <div className="rounded-lg bg-[#0B8A83]/5 p-3 text-xs space-y-1">
            {result.concept && (
              <p>
                <strong>Mood:</strong> {result.concept}
              </p>
            )}
            {result.colors && result.colors.length > 0 && (
              <div className="flex gap-1 mt-2">
                {result.colors.map((c) => (
                  <span
                    key={c}
                    className="w-6 h-6 rounded-full border"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {uploadedUrl && !loading && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void analyzeWithUrl(uploadedUrl, palette)}
          >
            Re-analyze
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
