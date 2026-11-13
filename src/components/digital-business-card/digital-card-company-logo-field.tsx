"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import { CeleCardCompanyMark, DemoCompanyMark } from "@/components/digital-business-card/demo-company-mark";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { readImageDimensions } from "@/lib/image/crop-utils";
import { validateClientImage } from "@/lib/media/upload-with-progress";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { celecardPaperTone } from "@/lib/digital-business-card/type-voice";
import { cn } from "@/lib/utils";

export function DigitalCardCompanyLogoField({
  value,
  onChange,
  company,
  theme,
  onError,
  onAction,
  mode = "api",
  compact,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  company?: string;
  theme: DigitalCardTheme;
  onError?: (message: string) => void;
  onAction?: (text: string) => void;
  mode?: "api" | "local";
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("logo.png");
  const [uploading, setUploading] = useState(false);

  async function pickFile(file: File) {
    const err = validateClientImage(file);
    if (err) {
      onError?.(err.replace("photo", "logo").replace("Photo", "Logo"));
      return;
    }
    try {
      const { url } = await readImageDimensions(file);
      setPendingName(file.name || "logo.png");
      setCropSrc(url);
    } catch {
      onError?.("Could not read that logo. Try PNG, JPEG, or WebP.");
    }
  }

  async function uploadLogo(blob: Blob, fileName: string): Promise<string> {
    if (mode === "local") {
      if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
      return URL.createObjectURL(blob);
    }
    const data = new FormData();
    data.append("file", new File([blob], fileName, { type: blob.type || "image/png" }));
    data.append("purpose", "logo");
    const res = await fetch("/api/digital-business-cards/avatar", { method: "POST", body: data });
    const json = (await res.json()) as { error?: string; data?: { url?: string } };
    if (!res.ok || !json.data?.url) {
      throw new Error(json.error || "Logo upload failed");
    }
    return json.data.url;
  }

  async function handleCropConfirm(blob: Blob, fileName: string) {
    setUploading(true);
    try {
      const url = await uploadLogo(blob, fileName);
      if (value?.startsWith("blob:") && value !== url) URL.revokeObjectURL(value);
      onChange(url);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Logo upload failed");
    } finally {
      setUploading(false);
      if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  function clearLogo(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(null);
    onAction?.("Company logo removed.");
  }

  const size = compact ? "h-14 w-14" : "h-16 w-16";
  const ink = celecardPaperTone(theme);

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,image/avif,.png,.jpg,.jpeg,.webp,.gif,.heic"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void pickFile(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        aria-label={value ? "Replace company logo" : "Upload company logo"}
        disabled={uploading}
        onClick={() => {
          onAction?.("Choose a logo, then crop it.");
          inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) void pickFile(file);
        }}
        className={cn(
          "relative overflow-hidden rounded-[14px] transition disabled:opacity-70",
          size
        )}
        style={{ boxShadow: `0 0 0 1px ${theme.border}` }}
      >
        {value ? (
          <CeleCardCompanyMark
            url={value}
            name={company || "Logo"}
            accent={theme.accent}
            metal={theme.border}
            className="h-full w-full"
          />
        ) : (
          <span className="relative flex h-full w-full items-center justify-center bg-white/80">
            {company ? (
              <DemoCompanyMark
                name={company}
                accent={theme.accent}
                metal={theme.border}
                className="h-full w-full"
              />
            ) : uploading ? null : (
              <Upload className="h-4 w-4" style={{ color: ink.accent }} />
            )}
            {company ? (
              <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/35 to-transparent pb-1">
                <Upload className="h-3.5 w-3.5 text-white" />
              </span>
            ) : null}
          </span>
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </span>
        ) : null}
      </button>
      {value ? (
        <button
          type="button"
          onClick={clearLogo}
          className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: ink.accent }}
        >
          <X className="h-3 w-3" />
          Remove
        </button>
      ) : null}
      {cropSrc ? (
        <ImageCropDialog
          open
          imageSrc={cropSrc}
          fileName={pendingName}
          defaultAspect="rounded-square"
          allowedAspects={[...CROP_PRESETS.logo]}
          onClose={() => {
            if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </div>
  );
}
