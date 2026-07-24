"use client";

import { useId, useRef, useState } from "react";
import { Upload, Video, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VIDEO_ACCEPT_ATTR, ALLOWED_VIDEO_EXTENSIONS, type VideoCategory } from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";
import { formatBytes } from "@/lib/video/upload-client";
import { VideoUploader, type UploadedVideoResult } from "@/components/media/video-uploader";

interface QueuedFile {
  id: string;
  file: File;
}

export interface MultiVideoUploaderProps {
  category: VideoCategory;
  eventId?: string;
  vendorId?: string;
  orderId?: string;
  guestToken?: string;
  guestName?: string;
  guestPhone?: string;
  mute?: boolean;
  role?: string;
  hint?: string;
  buttonLabel?: string;
  disabled?: boolean;
  className?: string;
  onUploaded: (result: UploadedVideoResult) => void;
  onError?: (message: string) => void;
  allowCameraCapture?: boolean;
  /** Remaining number of videos that may be added right now (e.g. gallery slots left). */
  maxFiles?: number;
  /**
   * How many videos upload at once — the rest wait client-side as "Queued".
   * The background worker already transcodes one job at a time (see
   * `processJobs` in `src/lib/queue.ts`), so this mainly protects upload
   * bandwidth; it also naturally throttles how fast `BackgroundJob` rows pile up.
   */
  concurrency?: number;
}

function looksLikeVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const ext = extractExtension(file.name);
  return !!ext && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

export function MultiVideoUploader({
  category,
  eventId,
  vendorId,
  orderId,
  guestToken,
  guestName,
  guestPhone,
  mute,
  role,
  hint,
  buttonLabel = "Add videos",
  disabled,
  className,
  onUploaded,
  onError,
  allowCameraCapture,
  maxFiles,
  concurrency = 2,
}: MultiVideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const remainingCapacity = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - files.length);

  function removeItem(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter(looksLikeVideoFile);
    if (incoming.length === 0) return;

    if (remainingCapacity <= 0) {
      onError?.(
        maxFiles === 1
          ? "Maximum of 1 video reached."
          : `Maximum of ${maxFiles} videos reached — remove one to add another.`
      );
      return;
    }

    const accepted = incoming.slice(0, remainingCapacity);
    if (accepted.length < incoming.length) {
      onError?.(
        `Only ${accepted.length} more video slot${accepted.length === 1 ? "" : "s"} available — added the first ${accepted.length} of ${incoming.length} selected.`
      );
    }

    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file })),
    ]);
  }

  const activeFiles = files.slice(0, concurrency);
  const queuedFiles = files.slice(concurrency);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-5 text-center transition-colors",
          dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <Video className="h-8 w-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-3">
          {hint ?? "Select or drag & drop one or more videos — phone, DSLR, WhatsApp/TikTok/Instagram exports, or screen recordings all work."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="gap-2 min-h-[44px] touch-manipulation"
          disabled={disabled || remainingCapacity <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> {buttonLabel}
        </Button>
        <p className="text-[11px] text-slate-400 mt-2">
          {maxFiles !== undefined
            ? `or drag & drop multiple files · ${remainingCapacity} more slot${remainingCapacity === 1 ? "" : "s"} available`
            : "or drag & drop multiple files at once"}
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={VIDEO_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {activeFiles.map(({ id, file }) => (
            <div key={id} className="rounded-xl border border-slate-200 bg-white p-1">
              <VideoUploader
                category={category}
                eventId={eventId}
                vendorId={vendorId}
                orderId={orderId}
                guestToken={guestToken}
                guestName={guestName}
                guestPhone={guestPhone}
                mute={mute}
                role={role}
                initialFile={file}
                allowCameraCapture={allowCameraCapture}
                disabled={disabled}
                onUploaded={(result) => {
                  onUploaded(result);
                  removeItem(id);
                }}
                onError={onError}
                onClear={() => removeItem(id)}
              />
            </div>
          ))}

          {queuedFiles.map(({ id, file }) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3"
            >
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)} · Queued — waiting for a slot</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => removeItem(id)}
                aria-label="Remove from queue"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
