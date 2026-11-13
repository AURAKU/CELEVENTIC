"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import { celecardPaperTone } from "@/lib/digital-business-card/type-voice";
import {
  CELECARD_PORTRAIT_FRAMES,
  celecardPortraitCropAspect,
  celecardPortraitFrameClass,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { cn } from "@/lib/utils";

const FRAME_LABELS: Record<CeleCardPortraitFrame, string> = {
  circle: "Circle",
  square: "Square",
  rounded: "Soft square",
  arch: "Arch",
};

function FrameGlyph({ frame, accent }: { frame: CeleCardPortraitFrame; accent: string }) {
  const radius =
    frame === "circle" ? "999px" : frame === "rounded" ? "5px" : frame === "arch" ? "50% 50% 8px 8px" : "2px";
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 shrink-0 border-2"
      style={{ borderColor: accent, borderRadius: radius }}
    />
  );
}

function PortraitFramePicker({
  frame,
  theme,
  onChange,
}: {
  frame: CeleCardPortraitFrame;
  theme: DigitalCardTheme;
  onChange: (frame: CeleCardPortraitFrame, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, CELECARD_PORTRAIT_FRAMES.indexOf(frame));
  const ink = celecardPaperTone(theme);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointer);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function page(delta: number) {
    const next =
      CELECARD_PORTRAIT_FRAMES[
        (index + delta + CELECARD_PORTRAIT_FRAMES.length) % CELECARD_PORTRAIT_FRAMES.length
      ];
    onChange(next, FRAME_LABELS[next]);
  }

  function choose(item: CeleCardPortraitFrame) {
    onChange(item, FRAME_LABELS[item]);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-fit max-w-full">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ink.label }}>
        Frame
      </p>
      <div className="inline-flex flex-nowrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          aria-label="Previous frame"
          onClick={() => page(-1)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="studio-portrait-frame-menu"
          aria-label={`Portrait frame, ${FRAME_LABELS[frame]}`}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 min-w-[9rem] flex-nowrap items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-[11px] font-semibold"
          style={{ color: ink.accent, background: theme.accentSoft }}
        >
          <FrameGlyph frame={frame} accent={ink.accent} />
          {FRAME_LABELS[frame]}
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition", open ? "rotate-180" : "")} />
        </button>
        <button
          type="button"
          aria-label="Next frame"
          onClick={() => page(1)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {open ? (
        <ul
          id="studio-portrait-frame-menu"
          role="listbox"
          aria-label="Portrait frame"
          className="mt-1.5 w-[13.5rem] max-w-full rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
        >
          {CELECARD_PORTRAIT_FRAMES.map((item) => {
            const active = item === frame;
            return (
              <li key={item}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(item)}
                  className="flex w-full flex-nowrap items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold"
                  style={
                    active
                      ? { color: ink.accent, background: theme.accentSoft }
                      : { color: "#334155" }
                  }
                >
                  <FrameGlyph frame={item} accent={active ? ink.accent : "#64748b"} />
                  {FRAME_LABELS[item]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const AVATAR_PAGE_SIZE = 8;
type PortraitAvatarGroupId = "marks" | "people" | "creatures" | "studio";

function AvatarRow({
  id,
  label,
  emptyLabel,
  items,
  photo,
  selectedHouse,
  compact,
  theme,
  open,
  onToggle,
  onPick,
}: {
  id: PortraitAvatarGroupId;
  label: string;
  emptyLabel: string;
  items: ReturnType<typeof celeCardHouseAvatarsByGroup>;
  photo: boolean;
  selectedHouse: CeleCardHouseAvatarId;
  compact?: boolean;
  theme: DigitalCardTheme;
  open: boolean;
  onToggle: () => void;
  onPick: (id: CeleCardHouseAvatarId) => void;
}) {
  const selected = items.find((item) => item.id === selectedHouse);
  const activeInGroup = !photo && Boolean(selected);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedHouse));
  const pages = Math.max(1, Math.ceil(items.length / AVATAR_PAGE_SIZE));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pages - 1);
  const slice = items.slice(safePage * AVATAR_PAGE_SIZE, safePage * AVATAR_PAGE_SIZE + AVATAR_PAGE_SIZE);
  const menuId = `studio-portrait-${id}-menu`;
  const ink = celecardPaperTone(theme);

  useEffect(() => {
    if (!open) return;
    if (activeInGroup) setPage(Math.floor(selectedIndex / AVATAR_PAGE_SIZE));
  }, [open, activeInGroup, selectedIndex]);

  function turn(delta: number) {
    setPage((value) => (value + delta + pages) % pages);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={`${label}, ${activeInGroup && selected ? selected.label : emptyLabel}`}
        onClick={onToggle}
        className="flex w-full flex-nowrap items-center gap-2 whitespace-nowrap px-2 py-1.5 text-left"
      >
        <span
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full"
          style={{ boxShadow: `0 0 0 1px ${activeInGroup ? theme.accent : theme.border}` }}
        >
          {activeInGroup && selected ? (
            <DigitalCardHouseAvatar
              theme={theme}
              avatarUrl={celeCardHouseAvatarValue(selected.id)}
              className="h-full w-full"
              framed={false}
            />
          ) : (
            <span className="block h-full w-full rounded-full border border-dashed border-slate-200 bg-slate-50" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: ink.label }}
          >
            {label}
          </span>
          <span
            className="block truncate text-[12px] font-semibold"
            style={{ color: activeInGroup ? ink.accent : ink.text }}
          >
            {activeInGroup && selected ? selected.label : emptyLabel}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div id={menuId} className="space-y-2 border-t border-slate-100 px-2 py-2">
          {pages > 1 ? (
            <div className="flex flex-nowrap items-center justify-between gap-2">
              <button
                type="button"
                aria-label={`Previous ${label} page`}
                onClick={() => turn(-1)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="whitespace-nowrap text-[11px] font-semibold text-slate-500">
                {safePage + 1} of {pages}
              </p>
              <button
                type="button"
                aria-label={`Next ${label} page`}
                onClick={() => turn(1)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div className="celecard-avatar-row">
            {slice.map((item) => {
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
      ) : null}
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
  const well = celecardPortraitFrameClass(frame);
  const photo = isCeleCardPhotoUrl(value);
  const selectedHouse = celeCardHouseAvatarId(value);
  const selectedMeta = celeCardHouseAvatarMeta(selectedHouse);
  const marks = celeCardHouseAvatarsByGroup("mark");
  const people = celeCardHouseAvatarsByGroup("people");
  const creatures = celeCardHouseAvatarsByGroup("creature");
  const studio = celeCardHouseAvatarsByGroup("studio");
  const [notice, setNotice] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<PortraitAvatarGroupId | null>(null);
  const ink = celecardPaperTone(theme);

  useEffect(() => {
    if (!openGroup) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openGroup]);

  function toggleGroup(id: PortraitAvatarGroupId) {
    setOpenGroup((current) => (current === id ? null : id));
  }

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
            rounded={frame === "circle" ? "full" : frame === "square" ? "none" : "lg"}
            className="h-24 w-24 sm:h-28 sm:w-28"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-tight" style={{ color: ink.text }}>
            {photo
              ? "Cropped portrait"
              : `${selectedMeta.label} ${selectedMeta.kind === "avatar" ? "avatar" : "mark"}`}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: ink.muted }}>
            Upload any photo from this device, then crop the face into a circle or square frame. Or pick a house mark, a person, a creature, or a studio mark.
          </p>
          {photo ? (
            <button
              type="button"
              onClick={clearPhoto}
              className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: ink.accent }}
            >
              Use CeleYou mark
            </button>
          ) : null}
        </div>
      </div>

      {onPortraitFrameChange ? (
        <PortraitFramePicker
          frame={frame}
          theme={theme}
          onChange={(next, label) => {
            onPortraitFrameChange(next);
            confirm(`${label} frame selected.`);
          }}
        />
      ) : null}

      <DigitalCardStudioNotice message={notice} className="celecard-studio-notice-local" />

      <AvatarRow
        id="marks"
        label="Marks"
        emptyLabel="Choose a mark"
        items={marks}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        open={openGroup === "marks"}
        onToggle={() => toggleGroup("marks")}
        onPick={pickHouse}
      />
      <AvatarRow
        id="people"
        label="People"
        emptyLabel="Choose a person"
        items={people}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        open={openGroup === "people"}
        onToggle={() => toggleGroup("people")}
        onPick={pickHouse}
      />
      <AvatarRow
        id="creatures"
        label="Creatures"
        emptyLabel="Choose a creature"
        items={creatures}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        open={openGroup === "creatures"}
        onToggle={() => toggleGroup("creatures")}
        onPick={pickHouse}
      />
      <AvatarRow
        id="studio"
        label="Studio"
        emptyLabel="Choose a studio mark"
        items={studio}
        photo={photo}
        selectedHouse={selectedHouse}
        compact={compact}
        theme={theme}
        open={openGroup === "studio"}
        onToggle={() => toggleGroup("studio")}
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
