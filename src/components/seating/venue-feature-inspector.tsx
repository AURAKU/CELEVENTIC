"use client";

import { useEffect, useState } from "react";
import { Lock, Minus, Plus, RotateCcw, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VenueFeatureVisual } from "@/components/seating/venue-feature-visual";
import {
  clampVenueFeatureSize,
  VENUE_FEATURE_COLOR_PRESETS,
  VENUE_FEATURE_PRESETS,
  venueFeaturePreset,
} from "@/lib/seating/venue-feature-presets";
import type { StudioVenueElement, VenueElementKind } from "@/lib/seating/studio-types";
import { cn } from "@/lib/utils";

export type VenueFeatureInspectorProps = {
  element: StudioVenueElement;
  previewMode?: boolean;
  onRename: (label: string) => void;
  onUpdate: (patch: Partial<StudioVenueElement>) => void;
  onDelete: () => void;
  className?: string;
  variant?: "drawer" | "sheet";
};

export function VenueFeatureInspector({
  element,
  previewMode = false,
  onRename,
  onUpdate,
  onDelete,
  className,
  variant = "drawer",
}: VenueFeatureInspectorProps) {
  const preset = venueFeaturePreset(element.kind);
  const accent = element.color?.trim() || preset.color;
  const [nameDraft, setNameDraft] = useState(element.label);
  const [notesDraft, setNotesDraft] = useState(element.notes ?? "");
  const [widthDraft, setWidthDraft] = useState(String(element.width ?? preset.width));
  const [heightDraft, setHeightDraft] = useState(String(element.height ?? preset.height));
  const [rotationDraft, setRotationDraft] = useState(element.rotation ?? 0);
  const width = element.width ?? preset.width;
  const height = element.height ?? preset.height;
  const rotation = element.rotation ?? 0;

  useEffect(() => {
    setNameDraft(element.label);
    setNotesDraft(element.notes ?? "");
    setWidthDraft(String(element.width ?? preset.width));
    setHeightDraft(String(element.height ?? preset.height));
    setRotationDraft(element.rotation ?? 0);
  }, [
    element.id,
    element.label,
    element.notes,
    element.width,
    element.height,
    element.rotation,
    preset.width,
    preset.height,
  ]);

  function commitRename() {
    const next = nameDraft.trim();
    if (!next || next === element.label) {
      setNameDraft(element.label);
      return;
    }
    onRename(next);
  }

  function commitNotes() {
    const next = notesDraft.trim();
    if (next === (element.notes ?? "").trim()) return;
    onUpdate({ notes: next || undefined });
  }

  function scaleBy(factor: number) {
    onUpdate(clampVenueFeatureSize(width * factor, height * factor));
  }

  function commitSizeDrafts() {
    const nextW = Number(widthDraft);
    const nextH = Number(heightDraft);
    if (!Number.isFinite(nextW) || !Number.isFinite(nextH)) {
      setWidthDraft(String(width));
      setHeightDraft(String(height));
      return;
    }
    const next = clampVenueFeatureSize(nextW, nextH);
    setWidthDraft(String(next.width));
    setHeightDraft(String(next.height));
    if (next.width === width && next.height === height) return;
    onUpdate(next);
  }

  function commitRotation() {
    const next = ((Math.round(rotationDraft) % 360) + 360) % 360;
    if (next === (((rotation % 360) + 360) % 360)) return;
    onUpdate({ rotation: next });
  }

  return (
    <Card
      className={cn(
        "border-[#0B8A83]/25 bg-gradient-to-b from-[#0B8A83]/5 to-white",
        variant === "sheet" && "shadow-2xl",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Venue feature</CardTitle>
        <p className="text-xs capitalize text-slate-500">{element.kind.replace(/_/g, " ")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="mx-auto h-24 w-full max-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          style={{ transform: `rotate(${rotationDraft}deg)` }}
        >
          <VenueFeatureVisual
            kind={element.kind}
            label={element.label}
            color={accent}
            variant="inspector"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`venue-label-${element.id}`}>Name</Label>
          <Input
            id={`venue-label-${element.id}`}
            value={nameDraft}
            disabled={previewMode}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`venue-kind-${element.id}`}>Feature type</Label>
          <select
            id={`venue-kind-${element.id}`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={element.kind}
            disabled={previewMode || element.locked}
            onChange={(event) => {
              const kind = event.target.value as VenueElementKind;
              const nextPreset = venueFeaturePreset(kind);
              onUpdate({
                kind,
                color: element.color || nextPreset.color,
                width: element.width ?? nextPreset.width,
                height: element.height ?? nextPreset.height,
              });
            }}
          >
            {VENUE_FEATURE_PRESETS.map((preset) => (
              <option key={preset.kind} value={preset.kind}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
            <option value="label">Label</option>
            <option value="pillar">Pillar</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Size</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={previewMode || element.locked}
              className="gap-1"
              onClick={() => scaleBy(0.85)}
              title="Decrease size"
            >
              <Minus className="h-3.5 w-3.5" /> Smaller
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={previewMode || element.locked}
              className="gap-1"
              onClick={() => scaleBy(1.15)}
              title="Increase size"
            >
              <Plus className="h-3.5 w-3.5" /> Larger
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={previewMode || element.locked}
              className="gap-1 text-slate-600"
              onClick={() => onUpdate({ width: preset.width, height: preset.height })}
              title="Reset to default size"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`venue-w-${element.id}`} className="text-[11px] text-slate-500">
                Width
              </Label>
              <Input
                id={`venue-w-${element.id}`}
                type="number"
                min={56}
                max={520}
                value={widthDraft}
                disabled={previewMode || element.locked}
                onChange={(event) => setWidthDraft(event.target.value)}
                onBlur={commitSizeDrafts}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.target as HTMLInputElement).blur();
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`venue-h-${element.id}`} className="text-[11px] text-slate-500">
                Height
              </Label>
              <Input
                id={`venue-h-${element.id}`}
                type="number"
                min={44}
                max={420}
                value={heightDraft}
                disabled={previewMode || element.locked}
                onChange={(event) => setHeightDraft(event.target.value)}
                onBlur={commitSizeDrafts}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.target as HTMLInputElement).blur();
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`venue-rot-${element.id}`}>Rotation ({Math.round(rotationDraft)}°)</Label>
          <Input
            id={`venue-rot-${element.id}`}
            type="range"
            min={0}
            max={359}
            step={1}
            value={((Math.round(rotationDraft) % 360) + 360) % 360}
            disabled={previewMode || element.locked}
            onChange={(event) => setRotationDraft(Number(event.target.value))}
            onPointerUp={commitRotation}
            onKeyUp={commitRotation}
            onBlur={commitRotation}
            className="h-8 cursor-pointer accent-[#0B8A83]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Colour</Label>
          <div className="flex flex-wrap gap-1.5">
            {VENUE_FEATURE_COLOR_PRESETS.map((swatch) => {
              const active = accent.toLowerCase() === swatch.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  disabled={previewMode || element.locked}
                  title={swatch}
                  aria-label={`Set colour ${swatch}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    active
                      ? "scale-110 border-slate-900"
                      : "border-white shadow-sm ring-1 ring-slate-200"
                  )}
                  style={{ background: swatch }}
                  onClick={() => onUpdate({ color: swatch })}
                />
              );
            })}
          </div>
          <Input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(accent) ? accent : preset.color}
            disabled={previewMode || element.locked}
            className="h-9 w-full cursor-pointer p-1"
            onChange={(event) => onUpdate({ color: event.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`venue-notes-${element.id}`}>Notes</Label>
          <textarea
            id={`venue-notes-${element.id}`}
            value={notesDraft}
            disabled={previewMode}
            rows={2}
            placeholder="e.g. Near west door · power outlet needed"
            className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={commitNotes}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={previewMode}
            className="gap-1.5"
            onClick={() => onUpdate({ locked: !element.locked })}
          >
            {element.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {element.locked ? "Unlock" : "Lock"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={previewMode}
            className="gap-1.5"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Drag on the canvas to rearrange. Use the top rotation handle for a full 360° spin (or ±15° /
          Shift ±90° / [ ] keys), and the corner handle to resize. Locked features stay put until
          unlocked.
        </p>
      </CardContent>
    </Card>
  );
}
