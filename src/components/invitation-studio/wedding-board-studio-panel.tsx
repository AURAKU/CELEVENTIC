"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEDDING_BOARD,
  mergeWeddingBoard,
  type WeddingBoardContent,
  type WeddingBoardFeatureFlags,
} from "@/lib/invitation/wedding-board";

const FEATURE_TOGGLES: { key: keyof WeddingBoardFeatureFlags; label: string }[] = [
  { key: "guestWelcome", label: "Personalised guest welcome" },
  { key: "familyIntro", label: "Family introduction" },
  { key: "countdown", label: "Countdown" },
  { key: "location", label: "Venue & Google Maps" },
  { key: "programme", label: "Order of the day" },
  { key: "dressCode", label: "Dress code" },
  { key: "guestPolicy", label: "Guest & children policy" },
  { key: "story", label: "Our story" },
  { key: "gallery", label: "Gallery" },
  { key: "rsvp", label: "Kindly respond (RSVP)" },
  { key: "memory", label: "Memory vault" },
  { key: "closing", label: "Closing & replay" },
];

/**
 * Studio editor for The Forever Afaris. Every guest-visible line — including
 * the opening ceremony copy, the order of the day, and the RSVP contacts — is
 * editable here, so the template ships as a starting point rather than a
 * fixed card.
 */
export function WeddingBoardStudioPanel({
  value,
  onChange,
}: {
  value?: WeddingBoardContent | null;
  onChange: (next: WeddingBoardContent) => void;
}) {
  const board = mergeWeddingBoard(value);

  function patch(partial: Partial<WeddingBoardContent>) {
    onChange({ ...board, ...partial });
  }

  function patchFeature(key: keyof WeddingBoardFeatureFlags, on: boolean) {
    onChange({ ...board, features: { ...board.features, [key]: on } });
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
          Rewrite every line of the invitation, edit the order of the day, and switch sections on
          or off — the opening ceremony copy lives here too.
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
        <Field label="Word revealed by the gate">
          <Input value={board.gateWord} onChange={(e) => patch({ gateWord: e.target.value })} />
        </Field>
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

      <Group title="Story, RSVP & closing">
        <Field label="Story heading">
          <Input value={board.storyHeading} onChange={(e) => patch({ storyHeading: e.target.value })} />
        </Field>
        <Field label="Gallery heading">
          <Input value={board.galleryHeading} onChange={(e) => patch({ galleryHeading: e.target.value })} />
        </Field>
        <Field label="Story" wide>
          <Textarea rows={3} value={board.storyBody} onChange={(e) => patch({ storyBody: e.target.value })} />
        </Field>
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
      </Group>

      <div className="space-y-2">
        <Label>Sections on this invitation</Label>
        <div className="grid gap-2 sm:grid-cols-2">
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
        onClick={() => onChange({ ...DEFAULT_WEDDING_BOARD })}
      >
        Reset to the original Afari × Opoku wedding copy
      </button>
    </div>
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
