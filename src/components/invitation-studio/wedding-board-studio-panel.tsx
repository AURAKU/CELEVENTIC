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
import { invitationFontVars } from "@/lib/invitation-fonts";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEDDING_BOARD,
  mergeWeddingBoard,
  normaliseSectionOrder,
  type WeddingBoardContent,
  type WeddingBoardFeatureFlags,
  type WeddingEnvelopeStyle,
  type WeddingGateStyle,
  type WeddingSealColor,
  type WeddingSealMotif,
  type WeddingSectionId,
} from "@/lib/invitation/wedding-board";
import { WEDDING_SEAL_WAX } from "@/components/invitation/templates/forever-afaris-wedding-palette";

const SECTION_LABELS: Record<WeddingSectionId, string> = {
  hero: "Announcement",
  family: "Family introduction",
  details: "Date, time & venue",
  countdown: "Countdown",
  greeting: "Personalised greeting",
  programme: "Order of the day",
  venue: "Venue & Google Maps",
  dressCode: "Dress code",
  guestPolicy: "Guest & children policy",
  rsvp: "Kindly respond (RSVP)",
  story: "Our story",
  gallery: "Gallery",
  scratch: "Scratch to reveal",
  memory: "Memory vault",
  closing: "Closing & replay",
};

/** Section id → the feature flag that shows or hides it. */
const SECTION_FEATURE: Partial<Record<WeddingSectionId, keyof WeddingBoardFeatureFlags>> = {
  family: "familyIntro",
  countdown: "countdown",
  greeting: "greeting",
  programme: "programme",
  venue: "location",
  dressCode: "dressCode",
  guestPolicy: "guestPolicy",
  rsvp: "rsvp",
  story: "story",
  gallery: "gallery",
  scratch: "scratch",
  memory: "memory",
  closing: "closing",
};

const ENVELOPE_STYLES: { id: WeddingEnvelopeStyle; label: string }[] = [
  { id: "blush-floral", label: "Blush floral emboss" },
  { id: "ivory-lace", label: "Ivory lace" },
  { id: "champagne-botanical", label: "Champagne botanical" },
  { id: "rose-watercolour", label: "Rose watercolour" },
];

const GATE_STYLES: { id: WeddingGateStyle; label: string }[] = [
  { id: "golden-baroque", label: "Golden baroque ironwork" },
  { id: "ivory-arch", label: "Ivory arch" },
  { id: "botanical-trellis", label: "Botanical trellis" },
];

const SEAL_MOTIFS: { id: WeddingSealMotif; label: string }[] = [
  { id: "monogram", label: "Monogram letters" },
  { id: "swan", label: "Swan" },
  { id: "rose", label: "Rose" },
  { id: "laurel", label: "Laurel" },
];

const SEAL_COLORS = Object.entries(WEDDING_SEAL_WAX).map(([id, wax]) => ({
  id: id as WeddingSealColor,
  label: wax.label,
  swatch: wax.base,
}));

const PALETTE_FIELDS: {
  key: "accentColor" | "blushColor" | "inkColor" | "canvasColor";
  label: string;
  fallback: string;
}[] = [
  { key: "accentColor", label: "Champagne accent", fallback: "#C7A35A" },
  { key: "blushColor", label: "Blush wash", fallback: "#F6E2DE" },
  { key: "inkColor", label: "Heading ink", fallback: "#3A2A2E" },
  { key: "canvasColor", label: "Page canvas", fallback: "#FBF6EF" },
];

/**
 * Studio editor for The Forever Afaris. Every guest-visible line — including
 * the opening ceremony copy, the envelope paper, the wax, the gate, the order
 * of the day, and the scene order — is editable here, so the template ships as
 * a starting point rather than a fixed card.
 */
export function WeddingBoardStudioPanel({
  value,
  onChange,
}: {
  value?: WeddingBoardContent | null;
  onChange: (next: WeddingBoardContent) => void;
}) {
  const board = mergeWeddingBoard(value);
  const order = normaliseSectionOrder(board.sectionOrder);

  function patch(partial: Partial<WeddingBoardContent>) {
    onChange({ ...board, ...partial });
  }

  function patchFeature(key: keyof WeddingBoardFeatureFlags, on: boolean) {
    onChange({ ...board, features: { ...board.features, [key]: on } });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ sectionOrder: next });
  }

  return (
    <div
      className={cn(
        "space-y-5 rounded-xl border border-rose-200/70 bg-rose-50/40 p-4",
        invitationFontVars
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Wedding invitation content</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Rewrite every line of the invitation, design the opening ceremony, reorder the scenes,
          and switch any of them off — guests see your edits the moment you publish.
        </p>
      </div>

      <Group title="Opening ceremony">
        <Field label="Wax seal monogram">
          <Input
            value={board.sealMonogram}
            maxLength={16}
            placeholder="J | C"
            onChange={(e) => patch({ sealMonogram: e.target.value })}
          />
        </Field>
        <Field label="Seal instruction">
          <Input
            value={board.openingInstruction}
            onChange={(e) => patch({ openingInstruction: e.target.value })}
          />
        </Field>
        <Field label="Line on the envelope face">
          <Input
            value={board.envelopeAddressLine}
            onChange={(e) => patch({ envelopeAddressLine: e.target.value })}
          />
        </Field>
        <Field label="Word revealed by the gate">
          <Input value={board.gateWord} onChange={(e) => patch({ gateWord: e.target.value })} />
        </Field>
        <Field label="Envelope paper">
          <Choice
            value={board.envelopeStyle}
            options={ENVELOPE_STYLES}
            onChange={(envelopeStyle) => patch({ envelopeStyle })}
          />
        </Field>
        <Field label="Gate architecture">
          <Choice
            value={board.gateStyle}
            options={GATE_STYLES}
            onChange={(gateStyle) => patch({ gateStyle })}
          />
        </Field>
        <Field label="Wax colour">
          <Choice
            value={board.sealColor}
            options={SEAL_COLORS}
            onChange={(sealColor) => patch({ sealColor })}
          />
        </Field>
        <Field label="Seal relief">
          <Choice
            value={board.sealMotif}
            options={SEAL_MOTIFS}
            onChange={(sealMotif) => patch({ sealMotif })}
          />
        </Field>
        <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2">
          <span>
            Vibrate when the seal lifts
            <span className="ml-1 text-xs text-slate-400">(supported phones only)</span>
          </span>
          <Switch
            checked={board.haptics !== false}
            onCheckedChange={(v) => patch({ haptics: v })}
          />
        </label>
      </Group>

      <Group title="Colours">
        {PALETTE_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={f.label}
                value={board[f.key] || f.fallback}
                onChange={(e) => patch({ [f.key]: e.target.value } as Partial<WeddingBoardContent>)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <Input
                value={board[f.key]}
                placeholder={`${f.fallback} (default)`}
                onChange={(e) => patch({ [f.key]: e.target.value } as Partial<WeddingBoardContent>)}
              />
              {board[f.key] && (
                <button
                  type="button"
                  className="whitespace-nowrap px-1 text-xs text-slate-400 underline hover:text-rose-600"
                  onClick={() => patch({ [f.key]: "" } as Partial<WeddingBoardContent>)}
                >
                  Reset
                </button>
              )}
            </div>
          </Field>
        ))}
      </Group>

      <Group title="Announcement">
        <Field label="Eyebrow">
          <Input value={board.eyebrow} onChange={(e) => patch({ eyebrow: e.target.value })} />
        </Field>
        <Field label="Script title">
          <Input value={board.scriptTitle} onChange={(e) => patch({ scriptTitle: e.target.value })} />
        </Field>
        <Field label="Couple name 1">
          <Input value={board.coupleName1} onChange={(e) => patch({ coupleName1: e.target.value })} />
        </Field>
        <Field label="Couple name 2">
          <Input value={board.coupleName2} onChange={(e) => patch({ coupleName2: e.target.value })} />
        </Field>
        <Field label="Invitation line" wide>
          <Textarea
            rows={2}
            value={board.invitationCopy}
            onChange={(e) => patch({ invitationCopy: e.target.value })}
          />
        </Field>
        <Field label="Hashtag">
          <Input value={board.hashtag} onChange={(e) => patch({ hashtag: e.target.value })} />
        </Field>
        <Field label="Hero photo caption">
          <Input
            value={board.heroCaption}
            placeholder="Optional line under the portrait"
            onChange={(e) => patch({ heroCaption: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Families">
        <Field label="Heading">
          <Input value={board.familyHeading} onChange={(e) => patch({ familyHeading: e.target.value })} />
        </Field>
        <Field label="Introduction" wide>
          <Textarea
            rows={2}
            value={board.familyIntro}
            onChange={(e) => patch({ familyIntro: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Date, time & venue">
        <Field label="Weekday">
          <Input value={board.weekday} onChange={(e) => patch({ weekday: e.target.value })} />
        </Field>
        <Field label="Display date">
          <Input value={board.displayDate} onChange={(e) => patch({ displayDate: e.target.value })} />
        </Field>
        <Field label="Time">
          <Input value={board.timeLabel} onChange={(e) => patch({ timeLabel: e.target.value })} />
        </Field>
        <Field label="Reception note">
          <Input value={board.receptionText} onChange={(e) => patch({ receptionText: e.target.value })} />
        </Field>
        <Field label="Access note">
          <Input value={board.accessNote} onChange={(e) => patch({ accessNote: e.target.value })} />
        </Field>
        <Field label="Venue name">
          <Input value={board.venueName} onChange={(e) => patch({ venueName: e.target.value })} />
        </Field>
        <Field label="Venue address">
          <Input value={board.venueAddress} onChange={(e) => patch({ venueAddress: e.target.value })} />
        </Field>
        <Field label="Google Maps link">
          <Input
            value={board.mapUrl}
            placeholder="https://maps.google.com/…"
            onChange={(e) => patch({ mapUrl: e.target.value })}
          />
        </Field>
        <Field label="Maps button label">
          <Input
            value={board.mapButtonLabel}
            onChange={(e) => patch({ mapButtonLabel: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Countdown">
        <Field label="Heading">
          <Input
            value={board.countdownHeading}
            onChange={(e) => patch({ countdownHeading: e.target.value })}
          />
        </Field>
        <Field label="Target (ISO date-time)">
          <Input
            value={board.countdownTarget}
            placeholder="2026-08-15T14:00:00"
            onChange={(e) => patch({ countdownTarget: e.target.value })}
          />
        </Field>
        <Field label="Message once the day arrives" wide>
          <Input
            value={board.countdownExpiredMessage}
            onChange={(e) => patch({ countdownExpiredMessage: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Personalised greeting">
        <Field label="Heading">
          <Input
            value={board.greetingHeading}
            onChange={(e) => patch({ greetingHeading: e.target.value })}
          />
        </Field>
        <Field label="Name shown when the link has no guest">
          <Input
            value={board.greetingFallbackName}
            onChange={(e) => patch({ greetingFallbackName: e.target.value })}
          />
        </Field>
        <Field label="Message" wide>
          <Textarea
            rows={3}
            value={board.greetingBody}
            onChange={(e) => patch({ greetingBody: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Order of the day">
        <Field label="Heading" wide>
          <Input
            value={board.programmeHeading}
            onChange={(e) => patch({ programmeHeading: e.target.value })}
          />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          {board.programmeItems.map((item, i) => (
            <div key={item.id || i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="grid grid-cols-[7rem_1fr_auto] gap-2">
                <Input
                  aria-label={`Item ${i + 1} time`}
                  placeholder="2:00 PM"
                  value={item.time}
                  onChange={(e) =>
                    patch({
                      programmeItems: board.programmeItems.map((p, idx) =>
                        idx === i ? { ...p, time: e.target.value } : p
                      ),
                    })
                  }
                />
                <Input
                  aria-label={`Item ${i + 1} title`}
                  placeholder="Wedding Ceremony"
                  value={item.title}
                  onChange={(e) =>
                    patch({
                      programmeItems: board.programmeItems.map((p, idx) =>
                        idx === i ? { ...p, title: e.target.value } : p
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="px-2 text-xs text-slate-400 underline hover:text-rose-600"
                  onClick={() =>
                    patch({ programmeItems: board.programmeItems.filter((_, idx) => idx !== i) })
                  }
                >
                  Remove
                </button>
              </div>
              <Input
                aria-label={`Item ${i + 1} description`}
                placeholder="Description"
                value={item.description ?? ""}
                onChange={(e) =>
                  patch({
                    programmeItems: board.programmeItems.map((p, idx) =>
                      idx === i ? { ...p, description: e.target.value } : p
                    ),
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-brand-700 underline"
            onClick={() =>
              patch({
                programmeItems: [
                  ...board.programmeItems,
                  {
                    id: `item-${Date.now().toString(36)}`,
                    time: "",
                    title: "",
                    description: "",
                  },
                ],
              })
            }
          >
            + Add item
          </button>
        </div>
      </Group>

      <Group title="Dress code & policy">
        <Field label="Dress code heading">
          <Input
            value={board.dressCodeHeading}
            onChange={(e) => patch({ dressCodeHeading: e.target.value })}
          />
        </Field>
        <Field label="Guest policy heading">
          <Input
            value={board.guestPolicyHeading}
            onChange={(e) => patch({ guestPolicyHeading: e.target.value })}
          />
        </Field>
        <Field label="Ladies" wide>
          <Textarea
            rows={2}
            value={board.dressCodeLadies}
            onChange={(e) => patch({ dressCodeLadies: e.target.value })}
          />
        </Field>
        <Field label="Gents" wide>
          <Textarea
            rows={2}
            value={board.dressCodeGents}
            onChange={(e) => patch({ dressCodeGents: e.target.value })}
          />
        </Field>
        <Field label="Guest & children policy" wide>
          <Textarea
            rows={3}
            value={board.guestPolicyBody}
            onChange={(e) => patch({ guestPolicyBody: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="Story, gallery & scratch card">
        <Field label="Story heading">
          <Input value={board.storyHeading} onChange={(e) => patch({ storyHeading: e.target.value })} />
        </Field>
        <Field label="Gallery heading">
          <Input value={board.galleryHeading} onChange={(e) => patch({ galleryHeading: e.target.value })} />
        </Field>
        <Field label="Story" wide>
          <Textarea rows={3} value={board.storyBody} onChange={(e) => patch({ storyBody: e.target.value })} />
        </Field>
        <Field label="Scratch card heading">
          <Input value={board.scratchHeading} onChange={(e) => patch({ scratchHeading: e.target.value })} />
        </Field>
        <Field label="Scratch prompt">
          <Input value={board.scratchPrompt} onChange={(e) => patch({ scratchPrompt: e.target.value })} />
        </Field>
        <Field label="Hidden message" wide>
          <Textarea
            rows={2}
            value={board.scratchMessage}
            onChange={(e) => patch({ scratchMessage: e.target.value })}
          />
        </Field>
      </Group>

      <Group title="RSVP, memory vault & closing">
        <Field label="RSVP heading">
          <Input value={board.rsvpHeading} onChange={(e) => patch({ rsvpHeading: e.target.value })} />
        </Field>
        <Field label="Memory vault heading">
          <Input value={board.memoryHeading} onChange={(e) => patch({ memoryHeading: e.target.value })} />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">RSVP contacts</Label>
          {board.rsvpContacts.map((contact, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                aria-label={`Contact ${i + 1} name`}
                placeholder="Name"
                value={contact.name}
                onChange={(e) =>
                  patch({
                    rsvpContacts: board.rsvpContacts.map((c, idx) =>
                      idx === i ? { ...c, name: e.target.value } : c
                    ),
                  })
                }
              />
              <Input
                aria-label={`Contact ${i + 1} phone`}
                placeholder="+233 24 000 0000"
                value={contact.phone}
                onChange={(e) =>
                  patch({
                    rsvpContacts: board.rsvpContacts.map((c, idx) =>
                      idx === i ? { ...c, phone: e.target.value } : c
                    ),
                  })
                }
              />
              <button
                type="button"
                className="px-2 text-xs text-slate-400 underline hover:text-rose-600"
                onClick={() =>
                  patch({ rsvpContacts: board.rsvpContacts.filter((_, idx) => idx !== i) })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-brand-700 underline"
            onClick={() => patch({ rsvpContacts: [...board.rsvpContacts, { name: "", phone: "" }] })}
          >
            + Add contact
          </button>
        </div>
        <Field label="Memory vault body" wide>
          <Textarea rows={2} value={board.memoryBody} onChange={(e) => patch({ memoryBody: e.target.value })} />
        </Field>
        <Field label="Memory vault button">
          <Input value={board.memoryCta} onChange={(e) => patch({ memoryCta: e.target.value })} />
        </Field>
        <Field label="Closing heading">
          <Input value={board.closingHeading} onChange={(e) => patch({ closingHeading: e.target.value })} />
        </Field>
        <Field label="Closing message" wide>
          <Textarea
            rows={2}
            value={board.closingMessage}
            onChange={(e) => patch({ closingMessage: e.target.value })}
          />
        </Field>
        <Field label="Signature">
          <Input
            value={board.closingSignature}
            onChange={(e) => patch({ closingSignature: e.target.value })}
          />
        </Field>
        <Field label="Replay button label">
          <Input value={board.replayLabel} onChange={(e) => patch({ replayLabel: e.target.value })} />
        </Field>
      </Group>

      <div className="space-y-2">
        <Label>Scenes on this invitation</Label>
        <p className="text-xs text-slate-500">
          Drag-free reordering — move a scene up or down, or switch it off entirely.
        </p>
        <ol className="space-y-1.5">
          {order.map((id, i) => {
            const featureKey = SECTION_FEATURE[id];
            const on = featureKey ? board.features[featureKey] !== false : true;
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="w-5 text-xs tabular-nums text-slate-400">{i + 1}</span>
                <span className="flex-1">{SECTION_LABELS[id]}</span>
                <button
                  type="button"
                  aria-label={`Move ${SECTION_LABELS[id]} up`}
                  disabled={i === 0}
                  className="px-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  onClick={() => moveSection(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${SECTION_LABELS[id]} down`}
                  disabled={i === order.length - 1}
                  className="px-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  onClick={() => moveSection(i, 1)}
                >
                  ↓
                </button>
                {featureKey ? (
                  <Switch
                    aria-label={`Show ${SECTION_LABELS[id]}`}
                    checked={on}
                    onCheckedChange={(v) => patchFeature(featureKey, v)}
                  />
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Always</span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span>Personalised guest welcome</span>
            <Switch
              checked={board.features.guestWelcome !== false}
              onCheckedChange={(v) => patchFeature("guestWelcome", v)}
            />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span>Hero portrait photo</span>
            <Switch
              checked={board.features.heroPortrait !== false}
              onCheckedChange={(v) => patchFeature("heroPortrait", v)}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        className="text-xs text-slate-500 underline"
        onClick={() => onChange({ ...DEFAULT_WEDDING_BOARD })}
      >
        Reset to the original Afari × Opoku wedding copy
      </button>
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; swatch?: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="flex items-center gap-2">
              {o.swatch && (
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ background: o.swatch }}
                />
              )}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200/80 bg-white/60 p-3">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
