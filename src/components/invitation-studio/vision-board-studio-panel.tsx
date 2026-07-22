"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_VISION_BOARD,
  mergeVisionBoard,
  type VisionBoardContent,
  type VisionBoardFeatureFlags,
} from "@/lib/invitation/vision-board";

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
    <div className="space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
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
