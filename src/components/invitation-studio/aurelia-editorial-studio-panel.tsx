"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AURELIA_WEDDING_DEFAULTS,
  mergeAureliaWedding,
  type AureliaSectionId,
  type AureliaWeddingConfig,
} from "@/lib/experience/aurelia-editorial";

const SECTION_LABELS: Array<[AureliaSectionId, string]> = [
  ["story", "Our Story"],
  ["celebrations", "Celebrations"],
  ["venues", "Venues"],
  ["dress", "Dress code"],
  ["journey", "Our Journey"],
  ["rsvp", "RSVP"],
  ["gifts", "Gifts"],
  ["faq", "Questions"],
];

export function AureliaEditorialStudioPanel({
  value,
  onChange,
}: {
  value?: Partial<AureliaWeddingConfig>;
  onChange: (next: AureliaWeddingConfig) => void;
}) {
  const wedding = mergeAureliaWedding(value);

  function patch(partial: Partial<AureliaWeddingConfig>) {
    onChange(mergeAureliaWedding({ ...wedding, ...partial }));
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">
        Aurelia editorial
      </p>
      <div className="grid gap-2">
        <Label>Partner one</Label>
        <Input
          value={wedding.partnerOneName}
          onChange={(e) => patch({ partnerOneName: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Partner two</Label>
        <Input
          value={wedding.partnerTwoName}
          onChange={(e) => patch({ partnerTwoName: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Monogram</Label>
        <Input value={wedding.monogram} onChange={(e) => patch({ monogram: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Date line</Label>
        <Input value={wedding.dateDisplay} onChange={(e) => patch({ dateDisplay: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Hero tagline</Label>
        <Input value={wedding.heroTagline} onChange={(e) => patch({ heroTagline: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Our story</Label>
        <Textarea
          rows={6}
          value={wedding.storyParagraphs.join("\n\n")}
          onChange={(e) =>
            patch({
              storyParagraphs: e.target.value
                .split(/\n{2,}/)
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      {wedding.ceremonies.slice(0, 2).map((ceremony, index) => (
        <div key={ceremony.id} className="grid gap-2 rounded-lg border border-amber-100 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">
            Ceremony {index + 1}
          </p>
          <Input
            value={ceremony.title}
            onChange={(e) => {
              const ceremonies = wedding.ceremonies.map((item, i) =>
                i === index ? { ...item, title: e.target.value } : item
              );
              patch({ ceremonies });
            }}
          />
          <Input
            value={ceremony.venueName}
            onChange={(e) => {
              const ceremonies = wedding.ceremonies.map((item, i) =>
                i === index ? { ...item, venueName: e.target.value } : item
              );
              const venues = wedding.venues.map((item, i) =>
                i === index ? { ...item, venueName: e.target.value } : item
              );
              patch({ ceremonies, venues });
            }}
          />
          <Input
            value={ceremony.address}
            onChange={(e) => {
              const ceremonies = wedding.ceremonies.map((item, i) =>
                i === index ? { ...item, address: e.target.value } : item
              );
              const venues = wedding.venues.map((item, i) =>
                i === index ? { ...item, address: e.target.value } : item
              );
              patch({ ceremonies, venues });
            }}
          />
        </div>
      ))}
      <div className="grid gap-2">
        <Label>Gift details</Label>
        <Textarea
          rows={3}
          value={wedding.giftsDetails ?? ""}
          onChange={(e) => patch({ giftsDetails: e.target.value })}
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80 pt-1">
        Visible sections
      </p>
      {SECTION_LABELS.map(([id, label]) => (
        <label key={id} className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={wedding.sections?.[id]?.visible !== false}
            onChange={(e) =>
              patch({
                sections: {
                  ...wedding.sections,
                  [id]: { ...wedding.sections?.[id], visible: e.target.checked },
                },
              })
            }
          />
          {label}
        </label>
      ))}
      <p className="text-[11px] text-slate-500">
        Empty sections hide automatically. Saved values stay on this invitation only.
      </p>
    </div>
  );
}

export { AURELIA_WEDDING_DEFAULTS };
