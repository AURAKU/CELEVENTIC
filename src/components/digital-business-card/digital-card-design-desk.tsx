"use client";

import { useEffect, useState } from "react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { DigitalCardThemePicker } from "@/components/digital-business-card/digital-card-theme-picker";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { extractImagePalette } from "@/lib/extract-image-palette";
import { resolveDigitalCardTheme, type DigitalCardComposition, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import {
  atmosphereGroupId,
  CELECARD_ATMOSPHERE_GROUPS,
  CELECARD_COMPOSITIONS,
  CELECARD_HOUSE_PAPERS,
  CELECARD_ORNAMENTS,
  CELECARD_PAPER_WEIGHTS,
  paperToneFromBrightness,
  type CeleCardDesign,
  type CeleCardPaperWeight,
} from "@/lib/digital-business-card/design";
import { cn } from "@/lib/utils";

function LayoutGlyph({ id }: { id: DigitalCardComposition }) {
  return (
    <span
      className="relative mb-2 block h-8 w-[3.35rem] overflow-hidden rounded-md border border-slate-200 bg-slate-50"
      aria-hidden
    >
      {id === "portrait-led" || id === "iconic" ? (
        <span className={cn("absolute inset-y-0.5 left-0.5 rounded-[3px] bg-slate-300", id === "iconic" ? "w-[42%]" : "w-[34%]")} />
      ) : null}
      {id === "classic" ? (
        <>
          <span className="absolute left-1 top-1.5 h-5 w-5 rounded-full bg-slate-300" />
          <span className="absolute left-7 top-2 h-1.5 w-5 rounded-sm bg-slate-300" />
          <span className="absolute bottom-1.5 right-1 h-5 w-5 rounded-[3px] bg-slate-300" />
        </>
      ) : null}
      {id === "type-first" ? (
        <>
          <span className="absolute left-1 top-1.5 h-2 w-8 rounded-sm bg-slate-400" />
          <span className="absolute left-1 top-4 h-3 w-3 rounded-full bg-slate-300" />
          <span className="absolute bottom-1.5 right-1 h-4 w-4 rounded-[3px] bg-slate-300" />
        </>
      ) : null}
      {id === "media-first" ? (
        <>
          <span className="absolute left-1 top-1 h-6 w-6 rounded-[4px] bg-slate-400" />
          <span className="absolute right-1 top-2 h-1 w-4 rounded-sm bg-slate-300" />
          <span className="absolute bottom-1.5 right-1 h-4 w-4 rounded-[3px] bg-slate-300" />
        </>
      ) : null}
      {id === "grid" ? (
        <>
          <span className="absolute left-1 top-1 h-1.5 w-9 rounded-sm bg-slate-400" />
          <span className="absolute bottom-1 left-1 h-4 w-4 rounded-[3px] bg-slate-300" />
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-[3px] bg-slate-300" />
        </>
      ) : null}
      {id === "portrait-led" || id === "iconic" ? (
        <>
          <span className="absolute right-1 top-2 h-1.5 w-5 rounded-sm bg-slate-400" />
          <span className="absolute bottom-1.5 right-1 h-4 w-4 rounded-[3px] bg-slate-300" />
        </>
      ) : null}
    </span>
  );
}

export function DigitalCardDesignDesk({
  themeId,
  design,
  onThemeChange,
  onDesignChange,
  onError,
}: {
  themeId: DigitalCardThemeId;
  design: CeleCardDesign;
  onThemeChange: (themeId: DigitalCardThemeId) => void;
  onDesignChange: (design: CeleCardDesign) => void;
  onError?: (message: string) => void;
}) {
  const theme = resolveDigitalCardTheme(themeId);
  const composition = design.composition ?? theme.composition;
  const atmosphere = design.atmosphere ?? theme.atmosphere ?? "none";
  const ornament = design.ornament ?? theme.ornament ?? "foil";
  const paperWeight = design.paperWeight ?? "balanced";
  const [lookOpen, setLookOpen] = useState(false);
  const [atmoGroup, setAtmoGroup] = useState(atmosphereGroupId(atmosphere));
  const group = CELECARD_ATMOSPHERE_GROUPS.find((item) => item.id === atmoGroup) ?? CELECARD_ATMOSPHERE_GROUPS[0];
  const housePapers = theme.textureUrl
    ? [{ id: "look", label: "This look", url: theme.textureUrl, tone: "light" as const }, ...CELECARD_HOUSE_PAPERS.filter((item) => item.url !== theme.textureUrl)]
    : CELECARD_HOUSE_PAPERS;

  useEffect(() => {
    setAtmoGroup(atmosphereGroupId(atmosphere));
  }, [atmosphere]);

  function patch(next: Partial<CeleCardDesign>) {
    onDesignChange({ ...design, ...next });
  }

  function clearPaper() {
    const next = { ...design };
    delete next.paperUrl;
    delete next.paperTone;
    onDesignChange(next);
  }

  return (
    <section id="celecard-theme" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Design desk</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            The same tools used on every house template. Arrange the plate, pick a room, set the ornament, then drop in paper that blends into the card.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDesignChange({ paperUrl: design.paperUrl, paperTone: design.paperTone, paperWeight: design.paperWeight })}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
        >
          Reset layout to this look
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Start from a look</p>
            <p className="truncate text-sm font-semibold text-slate-900">{theme.previewLabel}</p>
            <p className="line-clamp-1 text-[11px] text-slate-500">{theme.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() => setLookOpen((open) => !open)}
            className="rounded-full bg-[#0B8A83] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            {lookOpen ? "Hide looks" : "Change look"}
          </button>
        </div>
        {lookOpen ? (
          <div className="mt-3">
            <DigitalCardThemePicker
              value={themeId}
              onChange={(id) => {
                onThemeChange(id);
                setLookOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Arrange the plate</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CELECARD_COMPOSITIONS.map((item) => {
            const active = composition === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ composition: item.id })}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  active ? "border-[#0B8A83] bg-[#0B8A83]/8 ring-2 ring-[#0B8A83]/20" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <LayoutGlyph id={item.id} />
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Atmosphere</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CELECARD_ATMOSPHERE_GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAtmoGroup(item.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                atmoGroup === item.id ? "border-[#0B8A83] bg-[#0B8A83] text-white" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {group.items.map((item) => {
            const active = atmosphere === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ atmosphere: item.id })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  active ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ornament</p>
        <div className="flex flex-wrap gap-1.5">
          {CELECARD_ORNAMENTS.map((item) => {
            const active = ornament === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ ornament: item.id })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  active ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Card paper</p>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Use a house texture, or upload a photo. CeleYou reads its light and blends it into the plate so the name, QR, and portrait stay clear.
        </p>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {housePapers.map((item) => {
            const active = design.paperUrl === item.url;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ paperUrl: item.url, paperTone: item.tone, paperWeight })}
                className={cn(
                  "overflow-hidden rounded-xl border text-left",
                  active ? "border-[#0B8A83] ring-2 ring-[#0B8A83]/25" : "border-slate-200"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="h-12 w-full object-cover" />
                <p className="px-1.5 py-1 text-[10px] font-semibold text-slate-700">{item.label}</p>
              </button>
            );
          })}
        </div>
        <ImageUploadCropper
          defaultAspect="16:9"
          allowedAspects={[...CROP_PRESETS.cover, "1:1", "free"]}
          enableCamera
          cameraFacing="environment"
          buttonLabel="Upload your own paper"
          hint="A room, fabric, sky, or studio wall. Crop the part that should fill the card."
          dropzoneNote="JPEG, HEIC, PNG, WebP · crop, then CeleYou blends it"
          previewUrl={design.paperUrl && !housePapers.some((item) => item.url === design.paperUrl) ? design.paperUrl : null}
          onClear={clearPaper}
          onError={onError}
          onCustomUpload={async (blob, fileName) => {
            const data = new FormData();
            data.append("file", new File([blob], fileName, { type: blob.type || "image/png" }));
            data.append("purpose", "paper");
            const res = await fetch("/api/digital-business-cards/avatar", { method: "POST", body: data });
            const json = (await res.json()) as { error?: string; data?: { url?: string } };
            if (!res.ok || !json.data?.url) throw new Error(json.error || "Could not save that background.");
            return { url: json.data.url, name: fileName };
          }}
          onUploaded={async (result) => {
            let paperTone = design.paperTone;
            try {
              const palette = await extractImagePalette(result.url);
              paperTone = paperToneFromBrightness(palette.brightness);
            } catch {
              /* keep previous tone */
            }
            patch({ paperUrl: result.url, paperTone, paperWeight });
          }}
        />
        {design.paperUrl ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {CELECARD_PAPER_WEIGHTS.map((item) => {
              const active = paperWeight === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch({ paperWeight: item.id as CeleCardPaperWeight })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    active ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-600"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
            <button type="button" onClick={clearPaper} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800">
              Clear paper
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
