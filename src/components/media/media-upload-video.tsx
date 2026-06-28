"use client";

import { useRef, useState } from "react";
import { Upload, Video, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  uploadFormDataWithProgress,
  CLIENT_MAX_VIDEO_BYTES,
} from "@/lib/media/upload-with-progress";
import { UploadedMedia } from "@/components/media/uploaded-media";

interface MediaUploadVideoProps {
  label?: string;
  hint?: string;
  uploadEndpoint?: string;
  extraFormFields?: Record<string, string>;
  onUploaded: (result: { url: string; name: string }) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  previewUrl?: string | null;
  onClear?: () => void;
  buttonLabel?: string;
  maxVideoBytes?: number;
}

export function MediaUploadVideo({
  label,
  hint = "Upload a video from your device.",
  uploadEndpoint = "/api/invitations/upload",
  extraFormFields,
  onUploaded,
  onError,
  disabled,
  className,
  previewUrl,
  onClear,
  buttonLabel = "Upload video",
  maxVideoBytes = CLIENT_MAX_VIDEO_BYTES,
}: MediaUploadVideoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("video/")) {
      onError?.("Please choose a video file (MP4 or WebM).");
      return;
    }
    if (file.size > maxVideoBytes) {
      onError?.(`Video too large. Max ${Math.round(maxVideoBytes / 1024 / 1024)}MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("role", extraFormFields?.role ?? "background");
      Object.entries(extraFormFields ?? {}).forEach(([k, v]) => fd.append(k, v));

      const { ok, json } = await uploadFormDataWithProgress(uploadEndpoint, fd, setProgress);
      if (!ok) {
        throw new Error((json.error as string) || "Upload failed");
      }
      const data = json.data as { url: string; name?: string };
      onUploaded({ url: data.url, name: data.name ?? file.name });
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function pickFile(file: File) {
    await uploadFile(file);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {label && <p className="text-sm font-medium text-slate-900">{label}</p>}

      {previewUrl ? (
        <div className="space-y-2">
          <div className="rounded-xl border bg-white p-3">
            <UploadedMedia src={previewUrl} alt="" video controls className="w-full max-h-40 rounded-lg object-cover" autoPlay={false} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-medium text-slate-800">Video ready</p>
              {onClear && (
                <Button type="button" size="icon" variant="ghost" onClick={onClear}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Replace video
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void pickFile(file);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-5 text-center transition-colors",
            dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <Video className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">{hint}</p>
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-h-[44px] touch-manipulation"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? `Uploading ${progress}%` : buttonLabel}
          </Button>
          <p className="text-[11px] text-slate-400 mt-2">
            or drag & drop · MP4 or WebM · max {Math.round(maxVideoBytes / 1024 / 1024)}MB
          </p>
          {uploading && (
            <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
