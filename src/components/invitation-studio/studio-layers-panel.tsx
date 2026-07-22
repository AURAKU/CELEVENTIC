"use client";

import { Eye, EyeOff, ChevronUp, ChevronDown, Move, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudioLayer } from "@/lib/invitation-studio/studio-layers";
import { SNAP_GUIDES, reorderLayers, type SnapGuideId } from "@/lib/invitation-studio/studio-layers";

interface StudioLayersPanelProps {
  layers: StudioLayer[];
  snapGuideId?: string;
  onLayersChange: (layers: StudioLayer[]) => void;
  onSnapGuideChange: (id: SnapGuideId | "none") => void;
}

export function StudioLayersPanel({
  layers,
  snapGuideId,
  onLayersChange,
  onSnapGuideChange,
}: StudioLayersPanelProps) {
  function move(index: number, dir: -1 | 1) {
    onLayersChange(reorderLayers(layers, index, index + dir));
  }

  function toggle(id: string) {
    onLayersChange(layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
        <Move className="h-4 w-4 text-[#0B8A83]" /> Layers
      </h3>
      <p className="text-xs text-slate-500">
        Reorder stacks layers front-to-back on the live invite. Hide layers guests should not see.
        Use snap guides for canvas alignment.
      </p>
      <div className="space-y-1">
        <Label className="flex items-center gap-1.5 text-xs">
          <Crosshair className="h-3.5 w-3.5" /> Snap guide
        </Label>
        <Select
          value={snapGuideId ?? "none"}
          onValueChange={(v) => onSnapGuideChange(v as SnapGuideId | "none")}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {SNAP_GUIDES.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ul className="space-y-1.5">
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
              layer.visible ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60"
            }`}
          >
            <div className="flex flex-col">
              <button
                type="button"
                disabled={index === 0}
                className="p-0.5 text-slate-400 disabled:opacity-30"
                onClick={() => move(index, -1)}
                aria-label="Move layer up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={index === layers.length - 1}
                className="p-0.5 text-slate-400 disabled:opacity-30"
                onClick={() => move(index, 1)}
                aria-label="Move layer down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <span className="flex-1 font-medium text-slate-700">{layer.label}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => toggle(layer.id)}>
              {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
