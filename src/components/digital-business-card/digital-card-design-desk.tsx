"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { DigitalCardThemePicker } from "@/components/digital-business-card/digital-card-theme-picker";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { extractImagePalette } from "@/lib/extract-image-palette";
import {
  celecardTypeVoice,
} from "@/lib/digital-business-card/type-voice";
import {
  resolveDigitalCardTheme,
  type DigitalCardComposition,
  type DigitalCardThemeId,
} from "@/lib/digital-business-card/themes";
import {
  atmosphereGroupId,
  CELECARD_ACCENTS,
  CELECARD_ATMOSPHERE_GROUPS,
  CELECARD_COMPOSITIONS,
  CELECARD_FACE_LEADS,
  CELECARD_GRAINS,
  CELECARD_HOUSE_PAPERS,
  CELECARD_INKS,
  CELECARD_LETTERING,
  CELECARD_MOTIONS,
  CELECARD_NAME_SCALES,
  CELECARD_ORNAMENTS,
  CELECARD_PAPER_WEIGHTS,
  CELECARD_QR_FINISHES,
  celeCardFaceLead,
  paperToneFromBrightness,
  type CeleCardAccent,
  type CeleCardDesign,
  type CeleCardFaceLead,
  type CeleCardGrain,
  type CeleCardInk,
  type CeleCardLettering,
  type CeleCardMotion,
  type CeleCardNameScale,
  type CeleCardPaperWeight,
  type CeleCardQrFinish,
} from "@/lib/digital-business-card/design";
import {
  CELECARD_PORTRAIT_FRAMES,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { cn } from "@/lib/utils";

type DeskFoldId = "look" | "arrange" | "paper" | "light" | "finish";

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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium",
        active ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-600 hover:border-slate-300"
      )}
    >
      {children}
    </button>
  );
}

function DeskFold({
  id,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: DeskFoldId;
  title: string;
  hint: string;
  open: boolean;
  onToggle: (id: DeskFoldId) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{hint}</span>
        </span>
        <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B8A83]">
          {open ? "Hide" : "Open"}
        </span>
      </button>
      {open ? <div className="border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4">{children}</div> : null}
    </div>
  );
}

const FRAME_COPY: Record<CeleCardPortraitFrame, { label: string; hint: string }> = {
  circle: { label: "Circle", hint: "A round portrait" },
  square: { label: "Square", hint: "A sharp ID plate" },
  rounded: { label: "Soft square", hint: "A gentle studio crop" },
};

export function DigitalCardDesignDesk({
  themeId,
  design,
  onThemeChange,
  onDesignChange,
  onError,
  portraitFrame,
  onPortraitFrameChange,
}: {
  themeId: DigitalCardThemeId;
  design: CeleCardDesign;
  onThemeChange: (themeId: DigitalCardThemeId) => void;
  onDesignChange: (design: CeleCardDesign) => void;
  onError?: (message: string) => void;
  portraitFrame?: CeleCardPortraitFrame | null;
  onPortraitFrameChange?: (frame: CeleCardPortraitFrame) => void;
}) {
  const theme = resolveDigitalCardTheme(themeId);
  const voice = celecardTypeVoice(theme, design.lettering);
  const composition = design.composition ?? theme.composition;
  const atmosphere = design.atmosphere ?? theme.atmosphere ?? "none";
  const ornament = design.ornament ?? theme.ornament ?? "foil";
  const paperWeight = design.paperWeight ?? "balanced";
  const nameScale = design.nameScale ?? "balanced";
  const faceLead = celeCardFaceLead(composition, design.faceLead);
  const lettering = design.lettering ?? voice.originStyle;
  const grain = design.grain ?? "paper";
  const [open, setOpen] = useState<Record<DeskFoldId, boolean>>({
    look: false,
    arrange: true,
    paper: true,
    light: false,
    finish: false,
  });
  const [atmoGroup, setAtmoGroup] = useState(atmosphereGroupId(atmosphere));
  const [morePaper, setMorePaper] = useState(false);
  const group = CELECARD_ATMOSPHERE_GROUPS.find((item) => item.id === atmoGroup) ?? CELECARD_ATMOSPHERE_GROUPS[0];
  const housePapers = useMemo(() => {
    const extras = CELECARD_HOUSE_PAPERS.filter((item) => item.url !== theme.textureUrl);
    return theme.textureUrl
      ? [{ id: "look", label: "This look", url: theme.textureUrl, tone: "light" as const }, ...extras]
      : extras;
  }, [theme.textureUrl]);
  const visiblePapers = morePaper ? housePapers : housePapers.slice(0, 8);
  const customPaper = Boolean(design.paperUrl && !housePapers.some((item) => item.url === design.paperUrl));

  useEffect(() => {
    setAtmoGroup(atmosphereGroupId(atmosphere));
  }, [atmosphere]);

  function patch(next: Partial<CeleCardDesign>) {
    onDesignChange({ ...design, ...next });
  }

  function clearKey<K extends keyof CeleCardDesign>(key: K) {
    const next = { ...design };
    delete next[key];
    onDesignChange(next);
  }

  function clearPaper() {
    const next = { ...design };
    delete next.paperUrl;
    delete next.paperTone;
    onDesignChange(next);
  }

  function resetToLook() {
    onDesignChange({
      paperUrl: design.paperUrl,
      paperTone: design.paperTone,
      paperWeight: design.paperWeight,
    });
  }

  function toggle(id: DeskFoldId) {
    setOpen((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section id="celecard-theme" className="space-y-3 rounded-2xl border border-slate-200 bg-[#fcfbf8] p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Design</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            Every tool used on the house templates, grouped so you can arrange the plate, set the light, and drop in your own background. CeleYou blends that photo into the paper so the name, QR, origin mark, and wordmark stay clear.
          </p>
        </div>
        <button
          type="button"
          onClick={resetToLook}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
        >
          Reset to this look
        </button>
      </div>

      <DeskFold
        id="look"
        title="Start from a look"
        hint={`${theme.previewLabel}. ${theme.tagline}`}
        open={open.look}
        onToggle={toggle}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{theme.name}</p>
          <p className="text-[11px] text-slate-500">{theme.artLabel || theme.previewLabel}</p>
        </div>
        <DigitalCardThemePicker
          value={themeId}
          onChange={(id) => {
            onThemeChange(id);
            setOpen((current) => ({ ...current, look: false, arrange: true, paper: true }));
          }}
        />
      </DeskFold>

      <DeskFold
        id="arrange"
        title="Arrange the plate"
        hint="Portrait led, name first, or the code beside the name. The card stays ID-1."
        open={open.arrange}
        onToggle={toggle}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Layout</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CELECARD_COMPOSITIONS.map((item) => {
            const active = composition === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const next = { ...design, composition: item.id };
                  delete next.faceLead;
                  onDesignChange(next);
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  active ? "border-[#0B8A83] bg-[#0B8A83]/8 ring-2 ring-[#0B8A83]/20" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <LayoutGlyph id={item.id} />
                <p className="whitespace-nowrap text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.hint}</p>
              </button>
            );
          })}
        </div>

        {composition !== "grid" ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lead with</p>
            <div className="grid grid-cols-3 gap-2">
              {CELECARD_FACE_LEADS.map((item) => {
                const active = faceLead === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ faceLead: item.id as CeleCardFaceLead })}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-left",
                      active ? "border-[#0B8A83] bg-[#0B8A83]/8" : "border-slate-200 bg-white"
                    )}
                  >
                    <p className="whitespace-nowrap text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Name size</p>
          <div className="flex flex-wrap gap-1.5">
            {CELECARD_NAME_SCALES.map((item) => (
              <Chip
                key={item.id}
                active={nameScale === item.id}
                onClick={() =>
                  item.id === "balanced" ? clearKey("nameScale") : patch({ nameScale: item.id as CeleCardNameScale })
                }
              >
                {item.label}
              </Chip>
            ))}
          </div>
        </div>
      </DeskFold>

      <DeskFold
        id="paper"
        title="Your background"
        hint="House paper, or a photo that blends into the plate. Not a raw image under the type."
        open={open.paper}
        onToggle={toggle}
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          CeleYou reads the light in the photo, fades it under the origin mark and wordmark, and keeps a quiet band behind the name so the QR and portrait stay readable.
        </p>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Paper</p>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visiblePapers.map((item) => {
            const active = design.paperUrl === item.url;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ paperUrl: item.url, paperTone: item.tone, paperWeight })}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white text-left",
                  active ? "border-[#0B8A83] ring-2 ring-[#0B8A83]/25" : "border-slate-200"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="h-12 w-full object-cover" />
                <p className="truncate whitespace-nowrap px-1.5 py-1 text-[10px] font-semibold text-slate-700">{item.label}</p>
              </button>
            );
          })}
        </div>
        {housePapers.length > 8 ? (
          <button
            type="button"
            onClick={() => setMorePaper((value) => !value)}
            className="mb-3 text-[11px] font-semibold text-[#0B8A83]"
          >
            {morePaper ? "Fewer house papers" : "More house papers"}
          </button>
        ) : null}

        <ImageUploadCropper
          defaultAspect="card"
          allowedAspects={[...CROP_PRESETS.paper]}
          enableCamera
          cameraFacing="environment"
          buttonLabel="Upload your background"
          hint="A room, fabric, sky, or studio wall. Crop to the card plate. CeleYou blends it into the paper."
          dropzoneNote="JPEG, HEIC, PNG, WebP · cropped and compressed like a portrait"
          previewUrl={customPaper ? design.paperUrl : null}
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
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">How strong the paper sits</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {CELECARD_PAPER_WEIGHTS.map((item) => (
                <Chip
                  key={item.id}
                  active={paperWeight === item.id}
                  onClick={() => patch({ paperWeight: item.id as CeleCardPaperWeight })}
                >
                  {item.label}
                </Chip>
              ))}
              <button type="button" onClick={clearPaper} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800">
                Clear background
              </button>
            </div>
          </div>
        ) : null}
      </DeskFold>

      <DeskFold
        id="light"
        title="Light on the plate"
        hint="The room behind the name. Cinema, place, house, or art."
        open={open.light}
        onToggle={toggle}
      >
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
          {group.items.map((item) => (
            <Chip key={item.id} active={atmosphere === item.id} onClick={() => patch({ atmosphere: item.id })}>
              {item.label}
            </Chip>
          ))}
        </div>
      </DeskFold>

      <DeskFold
        id="finish"
        title="Finish"
        hint="Foil, lettering, ink, photo frame, QR, grain, and guest-page motion."
        open={open.finish}
        onToggle={toggle}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Foil and frame</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_ORNAMENTS.map((item) => (
                <Chip key={item.id} active={ornament === item.id} onClick={() => patch({ ornament: item.id })}>
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lettering</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_LETTERING.map((item) => (
                <Chip
                  key={item.id}
                  active={lettering === item.id}
                  onClick={() => patch({ lettering: item.id as CeleCardLettering })}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ink</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_INKS.map((item) => (
                <Chip key={item.id} active={design.ink === item.id} onClick={() => patch({ ink: item.id as CeleCardInk })}>
                  {item.label}
                </Chip>
              ))}
              {design.ink ? (
                <button type="button" onClick={() => clearKey("ink")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  This look
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Accent</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={design.accent === item.id}
                  onClick={() => patch({ accent: item.id as CeleCardAccent })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    design.accent === item.id ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-600"
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.swatch }} aria-hidden />
                  {item.label}
                </button>
              ))}
              {design.accent ? (
                <button type="button" onClick={() => clearKey("accent")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  This look
                </button>
              ) : null}
            </div>
          </div>

          {onPortraitFrameChange ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Photo frame</p>
              <div className="flex flex-wrap gap-1.5">
                {CELECARD_PORTRAIT_FRAMES.map((frame) => (
                  <Chip key={frame} active={portraitFrame === frame} onClick={() => onPortraitFrameChange(frame)}>
                    {FRAME_COPY[frame].label}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">QR on the plate</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_QR_FINISHES.map((item) => (
                <Chip
                  key={item.id}
                  active={design.qrFinish === item.id}
                  onClick={() => patch({ qrFinish: item.id as CeleCardQrFinish })}
                >
                  {item.label}
                </Chip>
              ))}
              {design.qrFinish ? (
                <button type="button" onClick={() => clearKey("qrFinish")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  This look
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Grain</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_GRAINS.map((item) => (
                <Chip
                  key={item.id}
                  active={grain === item.id}
                  onClick={() => (item.id === "paper" ? clearKey("grain") : patch({ grain: item.id as CeleCardGrain }))}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Motion on the guest page</p>
            <div className="flex flex-wrap gap-1.5">
              {CELECARD_MOTIONS.map((item) => (
                <Chip
                  key={item.id}
                  active={design.motion === item.id}
                  onClick={() => patch({ motion: item.id as CeleCardMotion })}
                >
                  {item.label}
                </Chip>
              ))}
              {design.motion ? (
                <button type="button" onClick={() => clearKey("motion")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  This look
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DeskFold>
    </section>
  );
}
