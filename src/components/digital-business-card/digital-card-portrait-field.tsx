"use client";

import { useState } from "react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { DigitalCardStudioNotice } from "@/components/digital-business-card/digital-card-studio-notice";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import {
  celeCardHouseAvatarId,
  celeCardHouseAvatarMeta,
  celeCardHouseAvatarValue,
  celeCardHouseAvatarsByGroup,
  isCeleCardPhotoUrl,
  type CeleCardHouseAvatarId,
} from "@/lib/digital-business-card/portraits";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  CELECARD_PORTRAIT_FRAMES,
  celecardPortraitCropAspect,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { cn } from "@/lib/utils";

const FRAME_LABELS: Record<CeleCardPortraitFrame, string> = {
  circle: "Circle",
  square: "Square",
  rounded: "Soft square",
};

function AvatarRow({
  label,
  items,
  photo,
  selectedHouse,
  compact,
  theme,
  onPick,
}: {
  label: string;
  items: ReturnType<typeof celeCardHouseAvatarsByGroup>;
  photo: boolean;
  selectedHouse: CeleCardHouseAvatarId;
  compact?: boolean;
  theme: DigitalCardTheme;
  onPick: (id: CeleCardHouseAvatarId) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
        {label}
      </p>
      <div className="celecard-avatar-row">
        {items.map((item) => {
          const active = !photo && selectedHouse === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              aria-label={`${item.label}. ${item.hint}`}
              onClick={() => onPick(item.id)}
              className={cn(
                "overflow-hidden rounded-full transition duration-150 ease-out active:scale-95",
                compact ? "min-h-9 min-w-9" : "min-h-11 min-w-11",
                active ? "ring-2 ring-offset-2" : "opacity-80 hover:opacity-100"
              )}
              style={{
                boxShadow: active ? `0 0 0 2px ${theme.accent}` : `0 0 0 1px ${theme.border}`,
              }}
            >
              <DigitalCardHouseAvatar
                theme={theme}
                avatarUrl={celeCardHouseAvatarValue(item.id)}
                className="h-full w-full"
                framed={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DigitalCardPortraitField({
  value,
  onChange,
  theme,
  displayName,
  onError,
  mode = "api",
  compact,
  portraitFrame,
  onPortraitFrameChange,
  onAction,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  theme: DigitalCardTheme;
  displayName?: string;
  onError?: (message: string) => void;
  mode?: "api" | "local";
  compact?: boolean;
  portraitFrame?: CeleCardPortraitFrame | null;
  onPortraitFrameChange?: (frame: CeleCardPortraitFrame) => void;
  onAction?: (text: string) => void;
}) {
  const frame = resolveCeleCardPortraitFrame(theme, portraitFrame);
  const well =
    frame === "square" ? "rounded-[3px]" : frame === "rounded" ? "rounded-[0.85rem]" : "rounded-full";
  const photo = isCeleCardPhotoUrl(value);
  const selectedHouse = celeCardHouseAvatarId(value);
  const selectedMeta = celeCardHouseAvatarMeta(selectedHouse);
  const marks = celeCardHouseAvatarsByGroup("mark");
  const people = celeCardHouseAvatarsByGroup("people");
  const creatures = celeCardHouseAvatarsByGroup("creature");
  const studio = celeCardHouseAvatarsByGroup("studio");
  const [notice, setNotice] = useState<string | null>(null);

  function confirm(text: string) {
    setNotice(text);
    onAction?.(text);
  }

  function houseCopy(id: CeleCardHouseAvatarId) {
    const meta = celeCardHouseAvatarMeta(id);
    if (id === "celecard") return "CeleYou mark selected.";
    if (meta.kind === "mark") return `${meta.label} mark selected.`;
    return `${meta.label} selected.`;
  }

  function pickHouse(id: CeleCardHouseAvatarId) {
    if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(celeCardHouseAvatarValue(id));
    confirm(houseCopy(id));
  }

  function clearPhoto() {
    if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(celeCardHouseAvatarValue("celecard"));
    confirm("CeleYou mark restored.");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {photo && value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${displayName || "Card"} portrait`}
            className={cn("h-24 w-24 shrink-0 object-cover object-center sm:h-28 sm:w-28", well)}
            style={{ boxShadow: `0 0 0 1px ${theme.border}, 0 10px 22px rgba(0,0,0,0.18)` }}
          />
        ) : (
          <DigitalCardHouseAvatar
            theme={theme}
            avatarUrl={value}
            rounded={frame === "circle" ? "full" : frame === "rounded" ? "lg" : "none"}
            className="h-24 w-24 sm:h-28 sm:w-28"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-tight" style={{ color: theme.text }}>
            {photo
              ? "Cropped portrait"
              : `${selectedMeta.label} ${selectedMeta.kind === "avatar" ? "avatar" : "mark"}`}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.muted }}>
            Upload any photo from this device, then crop the face into a circle or square frame. Or pick a house mark, a person, a creature, or a studio mark.
          </p>
          {photo ? (
            <button
              type="button"
              onClick={clearPhoto}
              className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: theme.accent }}
            >
              Use CeleYou mark
            </button>
          ) : null}
        </div>
      </div>

      {onPortraitFrameChange ? (
        <div className="flex flex-wrap gap-1.5">
          {CELECARD_PORTRAIT_FRAMES.map((item) => {
            const active = frame === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onPortraitFrameChange(item);
                  confirm(`${FRAME_LABELS[item]} frame selected.`);
                }}
                className={cn(
                  "h-8 rounded-md border px-2.5 text-[11px] font-semibold transition duration-150 ease-out active:scale-95",
                  active ? "border-current" : "border-slate-200 text-slate-600"
                )}
                style={active ? { color: theme.accent, borderColor: theme.accent, background: theme.accentSoft } : undefined}
              >
                {FRAME_LABELS[item]}
              </button>
            );
          })}
        </div>
      ) : null}

      <DigitalCardStudioNotice message={notice} className="celecard-studio-notice-local" />

      <AvatarRow
        label="Marks"
        items={marks}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        onPick={pickHouse}
      />
      <AvatarRow
        label="People"
        items={people}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        onPick={pickHouse}
      />
      <AvatarRow
        label="Creatures"
        items={creatures}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        onPick={pickHouse}
      />
      <AvatarRow
        label="Studio"
        items={studio}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        onPick={pickHouse}
      />

      <ImageUploadCropper
        key={frame}
        defaultAspect={celecardPortraitCropAspect(frame)}
        allowedAspects={[...CROP_PRESETS.celecard]}
        enableCamera
        cameraFacing="user"
        buttonLabel="Upload and crop"
        hint="Phone gallery, camera, or a file from any device. Crop the part that should sit in the frame."
        dropzoneNote="JPEG, HEIC, PNG, WebP, GIF, AVIF · then crop to the frame"
        onError={onError}
        onPickerOpen={(source) => {
          confirm(source === "camera" ? "Take a photo, then crop it." : "Choose a photo, then crop it.");
        }}
        onUploaded={(result) => {
          if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
          onChange(result.url);
          confirm("Portrait cropped.");
        }}
        onCustomUpload={
          mode === "local"
            ? async (blob) => ({ url: URL.createObjectURL(blob), name: "portrait.png" })
            : async (blob, fileName) => {
                const data = new FormData();
                data.append("file", new File([blob], fileName, { type: blob.type || "image/png" }));
                const res = await fetch("/api/digital-business-cards/avatar", { method: "POST", body: data });
                const json = (await res.json()) as { error?: string; data?: { url?: string } };
                if (!res.ok || !json.data?.url) {
                  throw new Error(json.error || "Portrait upload failed");
                }
                return { url: json.data.url, name: fileName };
              }
        }
      />
    </div>
  );
}
