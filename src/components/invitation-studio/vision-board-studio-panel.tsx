"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_VISION_BOARD,
  mergeVisionBoard,
  normalizeSealInitials,
  TRADITIONAL_MARRIAGE_DEFAULT_SEAL,
  type VisionBoardContent,
  type VisionBoardFeatureFlags,
} from "@/lib/invitation/vision-board";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  getSealDesignPreset,
  resolveSealStyle,
  sealInkStyle,
  SEAL_DESIGN_PRESETS,
  SEAL_FONT_OPTIONS,
  SEAL_FONT_STACKS,
  SEAL_SIZE_IDS,
  SEAL_SIZE_LABELS,
  SEAL_SIZE_SCALE,
  SEAL_TEXT_COLOR_PRESETS,
  type SealFontChoice,
} from "@/lib/invitation/seal-design";

const FEATURE_TOGGLES: { key: keyof VisionBoardFeatureFlags; label: string }[] = [
  { key: "guestWelcome", label: "Guest welcome banner" },
  { key: "seating", label: "Seat / table display" },
  { key: "qr", label: "Live admission QR" },
  { key: "admissionCode", label: "4-digit gate code" },
  { key: "rsvp", label: "Digital RSVP" },
  { key: "location", label: "Location CTA" },
  { key: "music", label: "Ceremony music chip" },
  { key: "gallery", label: "Gallery chip" },
  { key: "memory", label: "Memory vault chip" },
  { key: "contributions", label: "Gifts chip" },
  { key: "timeline", label: "Timeline chip" },
];

export function VisionBoardStudioPanel({
  value,
  onChange,
}: {
  value?: VisionBoardContent | null;
  onChange: (next: VisionBoardContent) => void;
}) {
  const board = mergeVisionBoard(value);
  const sealStyle = resolveSealStyle(board);
  const sealPreset = getSealDesignPreset(sealStyle.design);
  const sealLabelPreview =
    normalizeSealInitials(board.sealInitials) || TRADITIONAL_MARRIAGE_DEFAULT_SEAL;
  const sealIsMonogram = sealLabelPreview.replace(/[\s|·•.]/g, "").length <= 3;
  const sealDefaultInkColor = sealIsMonogram ? sealPreset.monogramColor : sealPreset.wordColor;

  function patch(partial: Partial<VisionBoardContent>) {
    onChange({ ...board, ...partial });
  }

  function patchFeature(key: keyof VisionBoardFeatureFlags, on: boolean) {
    onChange({
      ...board,
      features: { ...board.features, [key]: on },
    });
  }

  function updateContact(index: number, field: "name" | "phone", v: string) {
    const contacts = board.rsvpContacts.map((c, i) =>
      i === index ? { ...c, [field]: v } : c
    );
    patch({ rsvpContacts: contacts });
  }

  return (
    <div className={`space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 ${invitationFontVars}`}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Vision board details</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Edit every line from the Traditional Marriage card. Toggle system features on or off
          without leaving the studio.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Eyebrow</Label>
          <Input value={board.eyebrow} onChange={(e) => patch({ eyebrow: e.target.value })} />
        </div>
        <div>
          <Label>Script title</Label>
          <Input value={board.scriptTitle} onChange={(e) => patch({ scriptTitle: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Family invite line</Label>
          <Textarea
            rows={3}
            value={board.familyInvite}
            onChange={(e) => patch({ familyInvite: e.target.value })}
          />
        </div>
        <div>
          <Label>Couple name 1</Label>
          <Input value={board.coupleName1} onChange={(e) => patch({ coupleName1: e.target.value })} />
        </div>
        <div>
          <Label>Couple name 2</Label>
          <Input value={board.coupleName2} onChange={(e) => patch({ coupleName2: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Wax seal</Label>
          <div className="mt-1.5 flex items-center gap-4">
            <SealLivePreview
              label={
                normalizeSealInitials(board.sealInitials) ||
                TRADITIONAL_MARRIAGE_DEFAULT_SEAL
              }
              sealStyle={sealStyle}
            />
            <div className="min-w-0 flex-1">
              <Input
                value={board.sealInitials}
                maxLength={16}
                placeholder="C | J"
                onChange={(e) => patch({ sealInitials: e.target.value })}
                className="max-w-[12rem] tracking-[0.06em] font-[family-name:var(--font-great-vibes)] text-xl"
                aria-describedby="seal-initials-hint"
              />
              <p id="seal-initials-hint" className="mt-1 text-[11px] text-slate-500">
                Shown on the wax seal when guests open the envelope. Monograms (C | J) or short
                words — default {TRADITIONAL_MARRIAGE_DEFAULT_SEAL}.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Seal design</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SEAL_DESIGN_PRESETS.map((preset) => {
                const active = sealStyle.design === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.description}
                    onClick={() => patch({ sealDesign: preset.id })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-1.5 text-center transition-all",
                      active
                        ? "border-brand-500 ring-2 ring-brand-500/30 bg-white"
                        : "border-slate-200 bg-white/60 hover:border-slate-300"
                    )}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-black/10 shadow-inner"
                      style={{ background: preset.swatch }}
                      aria-hidden
                    />
                    <span className="text-[9px] leading-tight text-slate-600">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Seal font</Label>
              <Select
                value={sealStyle.fontFamily}
                onValueChange={(v) => patch({ sealFontFamily: v as SealFontChoice })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEAL_FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span
                        style={{
                          fontFamily: f.id === "auto" ? undefined : SEAL_FONT_STACKS[f.id],
                        }}
                      >
                        {f.label}
                      </span>
                      <span className="ml-1.5 text-[10px] text-slate-400">{f.group}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Seal size</Label>
              <div className="flex gap-1.5">
                {SEAL_SIZE_IDS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => patch({ sealSize: size })}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                      sealStyle.size === size
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white/60 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {SEAL_SIZE_LABELS[size]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Seal text color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={sealStyle.textColor || sealDefaultInkColor}
                  onChange={(e) => patch({ sealTextColor: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded"
                  aria-label="Custom seal text color"
                />
                <Select
                  value={sealStyle.textColor || "auto"}
                  onValueChange={(v) => patch({ sealTextColor: v === "auto" ? "" : v })}
                >
                  <SelectTrigger className="h-9 flex-1 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEAL_TEXT_COLOR_PRESETS.map((c) => (
                      <SelectItem key={c.value || "auto"} value={c.value || "auto"}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ background: c.value || sealDefaultInkColor }}
                            aria-hidden
                          />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Label>Weekday</Label>
          <Input value={board.weekday} onChange={(e) => patch({ weekday: e.target.value })} />
        </div>
        <div>
          <Label>Month</Label>
          <Input value={board.monthLabel} onChange={(e) => patch({ monthLabel: e.target.value })} />
        </div>
        <div>
          <Label>Day</Label>
          <Input value={board.dayNumber} onChange={(e) => patch({ dayNumber: e.target.value })} />
        </div>
        <div>
          <Label>Time</Label>
          <Input value={board.timeLabel} onChange={(e) => patch({ timeLabel: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Dress code</Label>
          <Textarea
            rows={2}
            value={board.dressCodeLine}
            onChange={(e) => patch({ dressCodeLine: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Sentiment</Label>
          <Input value={board.sentiment} onChange={(e) => patch({ sentiment: e.target.value })} />
        </div>
        <div>
          <Label>Location CTA</Label>
          <Input value={board.locationCta} onChange={(e) => patch({ locationCta: e.target.value })} />
        </div>
        <div>
          <Label>Hashtag</Label>
          <Input value={board.hashtag} onChange={(e) => patch({ hashtag: e.target.value })} />
        </div>
        <div>
          <Label>RSVP heading</Label>
          <Input value={board.rsvpHeading} onChange={(e) => patch({ rsvpHeading: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>RSVP contacts</Label>
        {board.rsvpContacts.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateContact(i, "name", e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={c.phone}
              onChange={(e) => updateContact(i, "phone", e.target.value)}
            />
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-brand-700 underline"
          onClick={() =>
            patch({
              rsvpContacts: [...board.rsvpContacts, { name: "", phone: "" }],
            })
          }
        >
          + Add contact
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={board.showArtBackdrop}
            onCheckedChange={(v) => patch({ showArtBackdrop: v })}
          />
          Show invitation art
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={board.liveTypography}
            onCheckedChange={(v) => patch({ liveTypography: v })}
          />
          Live editable typography
        </label>
      </div>

      <div className="space-y-2">
        <Label>Features on this invite</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {FEATURE_TOGGLES.map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span>{f.label}</span>
              <Switch
                checked={board.features[f.key] !== false}
                onCheckedChange={(v) => patchFeature(f.key, v)}
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="text-xs text-slate-500 underline"
        onClick={() => onChange({ ...DEFAULT_VISION_BOARD })}
      >
        Reset to original Afari × Opoku card copy
      </button>
    </div>
  );
}

/**
 * Mini wax seal chip — mirrors the guest-facing embroidered seal:
 * same design preset gradients + font/size/color the host has chosen.
 */
function SealLivePreview({
  label,
  sealStyle,
}: {
  label: string;
  sealStyle: ReturnType<typeof resolveSealStyle>;
}) {
  const preset = getSealDesignPreset(sealStyle.design);
  const letters = label.replace(/[\s|·•.]/g, "").length;
  const monogram =
    letters > 0 &&
    letters <= 3 &&
    /^[a-zA-ZÀ-ÿ\s|·•.]+$/.test(label.trim()) &&
    !/&/.test(label);
  const pipeMonogram = monogram && /\s*\|\s*/.test(label);
  const compact = letters > 4;
  const inkColor = sealStyle.textColor || (monogram ? preset.monogramColor : preset.wordColor);
  const ink = sealInkStyle(inkColor, Boolean(preset.dark), monogram);
  const fontFamily =
    sealStyle.fontFamily !== "auto"
      ? SEAL_FONT_STACKS[sealStyle.fontFamily]
      : monogram
        ? "var(--font-cinzel), Cinzel, serif"
        : "var(--font-great-vibes), 'Great Vibes', cursive";
  const fontWeight =
    sealStyle.fontFamily !== "auto"
      ? { "great-vibes": 400, cinzel: 600, playfair: 600, cormorant: 500, poppins: 600 }[
          sealStyle.fontFamily
        ]
      : monogram
        ? 600
        : 400;
  const sizeScale = SEAL_SIZE_SCALE[sealStyle.size];

  return (
    <div
      className="relative shrink-0"
      style={{ width: "4.75rem", height: "4.75rem" }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="studioWaxPearl" cx="34%" cy="28%" r="72%">
            {preset.face.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <linearGradient id="studioWaxRim" x1="18%" y1="10%" x2="82%" y2="90%">
            {preset.rim.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <radialGradient id="studioWaxBead" cx="32%" cy="28%" r="68%">
            {preset.bead.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
        </defs>
        <ellipse cx="51.5" cy="54" rx="41" ry="39" fill="rgba(120,70,50,0.16)" />
        <circle cx="50" cy="50" r="46" fill="url(#studioWaxRim)" />
        <circle cx="50" cy="50" r="37.5" fill="url(#studioWaxPearl)" />
        {Array.from({ length: 32 }, (_, i) => {
          const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={50 + Math.cos(a) * 38.5}
              cy={50 + Math.sin(a) * 38.5}
              r="1.45"
              fill="url(#studioWaxBead)"
            />
          );
        })}
        <ellipse
          cx="36"
          cy="33"
          rx="18"
          ry="12"
          fill={preset.dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.42)"}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-center leading-none"
        style={{
          color: inkColor,
          fontFamily,
          fontWeight,
          fontSize: compact
            ? "0.72rem"
            : pipeMonogram
              ? "0.95rem"
              : monogram
                ? "1.25rem"
                : "1.35rem",
          letterSpacing: pipeMonogram
            ? "0.02em"
            : monogram && letters === 2
              ? "0.14em"
              : monogram
                ? "0.08em"
                : "0.02em",
          textTransform: monogram ? "uppercase" : "none",
          textShadow: ink.textShadow,
          WebkitTextStroke: ink.webkitTextStroke,
          padding: "12%",
          whiteSpace: monogram ? "nowrap" : /\s/.test(label) ? "pre-line" : "nowrap",
          transform: sizeScale !== 1 ? `scale(${sizeScale})` : undefined,
        }}
      >
        {monogram
          ? label.trim()
          : /\s/.test(label.trim())
            ? label.trim().split(/\s+/).join("\n")
            : label}
      </span>
    </div>
  );
}
