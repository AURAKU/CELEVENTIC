"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon, Video, FileText, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractImagePalette } from "@/lib/extract-image-palette";
import type { InvitationMediaAsset, MediaType } from "@/types/invitation-design";
import type { UploadAnalysisResult } from "@/services/invitations/invitation-inspiration.service";

interface MediaUploaderProps {
  assets: InvitationMediaAsset[];
  onChange: (assets: InvitationMediaAsset[]) => void;
  onAnalysis?: (analysis: UploadAnalysisResult | null) => void;
  buildMode?: string;
  disabled?: boolean;
}

export function MediaUploader({ assets, onChange, onAnalysis, buildMode = "inspired", disabled }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [lastConcept, setLastConcept] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(true);
    onAnalysis?.(null);

    const newAssets: InvitationMediaAsset[] = [...assets];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const isVideo = file.type.startsWith("video/");
      const isPdf = file.type === "application/pdf";
      formData.append("role", isVideo ? "background" : isPdf ? "attachment" : "hero");
      formData.append("buildMode", buildMode);

      if (file.type.startsWith("image/")) {
        setAnalyzing(true);
        try {
          const previewUrl = URL.createObjectURL(file);
          const palette = await extractImagePalette(previewUrl);
          URL.revokeObjectURL(previewUrl);
          formData.append("colors", JSON.stringify(palette.colors));
          formData.append("brightness", String(palette.brightness));
          formData.append("aspectRatio", String(palette.aspectRatio));
        } catch {
          /* proceed without palette */
        }
        setAnalyzing(false);
      }

      const res = await fetch("/api/invitations/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        continue;
      }

      newAssets.push({
        url: data.data.url,
        type: data.data.type as MediaType,
        role: data.data.role,
        name: data.data.name,
      });

      if (data.data.analysis) {
        onAnalysis?.(data.data.analysis);
        setLastConcept(data.data.analysis.concept.style);
      }
    }

    onChange(newAssets);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAsset(index: number) {
    const next = assets.filter((_, i) => i !== index);
    onChange(next);
    if (next.length === 0) {
      onAnalysis?.(null);
      setLastConcept(null);
    }
  }

  const iconFor = (type: MediaType) => {
    if (type === "video") return <Video className="h-4 w-4" />;
    if (type === "pdf") return <FileText className="h-4 w-4" />;
    return <ImageIcon className="h-4 w-4" />;
  };

  const busy = uploading || analyzing;

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          disabled ? "opacity-50 pointer-events-none" : "hover:border-brand-400 cursor-pointer"
        }`}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.jfif,.pdf,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        {busy ? (
          <Loader2 className="h-8 w-8 mx-auto text-brand-600 animate-spin" />
        ) : (
          <Upload className="h-8 w-8 mx-auto text-slate-400" />
        )}
        <p className="text-sm font-medium mt-2">
          {analyzing ? "Analyzing colors & style..." : uploading ? "Uploading..." : "Upload your sample design"}
        </p>
        <p className="text-xs page-subtitle">
          Image, PDF, or video — AI extracts inspiration and builds a similar or improved design
        </p>
      </div>

      {lastConcept && (
        <div className="rounded-lg bg-brand-50 border border-brand-200 p-3 text-xs text-brand-800 flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Inspiration applied: <strong>{lastConcept}</strong> — layout, colors, and typography auto-matched from your upload.</span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {assets.length > 0 && (
        <div className="space-y-2">
          {assets.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-mesh text-sm">
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-brand-100 flex items-center justify-center text-brand-700">
                  {iconFor(a.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{a.name ?? a.type}</p>
                <p className="text-xs text-slate-500 capitalize">{a.role} · {a.type}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeAsset(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
