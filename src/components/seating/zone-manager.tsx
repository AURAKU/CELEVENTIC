"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VENUE_FEATURE_COLOR_PRESETS } from "@/lib/seating/venue-feature-presets";
import { cn } from "@/lib/utils";

export type ManageableZone = {
  id: string;
  name: string;
  color: string;
};

export type ZoneManagerProps = {
  zones: ManageableZone[];
  previewMode?: boolean;
  title?: string;
  hint?: string;
  activeZoneId?: string | null;
  onSelect?: (zoneId: string) => void;
  onCreate: (input: { name: string; color: string }) => void;
  onUpdate: (zoneId: string, patch: { name?: string; color?: string }) => void;
  onDelete: (zoneId: string) => void;
  className?: string;
};

export function ZoneManager({
  zones,
  previewMode = false,
  title = "Zones",
  hint,
  activeZoneId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  className,
}: ZoneManagerProps) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>(VENUE_FEATURE_COLOR_PRESETS[0]!);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#0B8A83");

  useEffect(() => {
    if (!editingId) return;
    const zone = zones.find((item) => item.id === editingId);
    if (!zone) {
      setEditingId(null);
      return;
    }
    setEditName(zone.name);
    setEditColor(zone.color);
  }, [editingId, zones]);

  function resetCreate() {
    setCreating(false);
    setDraftName("");
    setDraftColor(VENUE_FEATURE_COLOR_PRESETS[0]!);
  }

  function submitCreate() {
    const name = draftName.trim();
    if (!name) return;
    onCreate({ name, color: draftColor });
    resetCreate();
  }

  function submitEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    onUpdate(editingId, { name, color: editColor });
    setEditingId(null);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{hint}</p>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          disabled={previewMode}
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> New zone
        </Button>
      </div>

      {creating && (
        <div className="space-y-2 rounded-xl border border-[#0B8A83]/25 bg-[#0B8A83]/5 p-3">
          <div className="space-y-1">
            <Label htmlFor="zone-create-name">Zone name</Label>
            <Input
              id="zone-create-name"
              value={draftName}
              disabled={previewMode}
              placeholder="e.g. Reserved front"
              autoFocus
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCreate();
                }
                if (event.key === "Escape") resetCreate();
              }}
            />
          </div>
          <ColorSwatches
            value={draftColor}
            disabled={previewMode}
            onChange={setDraftColor}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="bg-[#0B8A83]" disabled={previewMode} onClick={submitCreate}>
              <Check className="h-3.5 w-3.5" /> Save zone
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetCreate}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {zones.length === 0 && !creating && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
            No zones yet — create one for reserved, family, or special guest blocks.
          </p>
        )}
        {zones.map((zone) => {
          const editing = editingId === zone.id;
          const active = activeZoneId === zone.id;
          if (editing) {
            return (
              <div
                key={zone.id}
                className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <Input
                  value={editName}
                  disabled={previewMode}
                  autoFocus
                  onChange={(event) => setEditName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitEdit();
                    }
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <ColorSwatches value={editColor} disabled={previewMode} onChange={setEditColor} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="bg-[#0B8A83]" onClick={submitEdit}>
                    <Check className="h-3.5 w-3.5" /> Update
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div
              key={zone.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-2 transition",
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800"
              )}
              style={active ? { background: zone.color } : undefined}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                disabled={previewMode}
                onClick={() => onSelect?.(zone.id)}
                title={onSelect ? `Use ${zone.name}` : zone.name}
              >
                <span className="inline-flex items-center gap-2 truncate text-sm font-medium">
                  {!active && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ background: zone.color }}
                    />
                  )}
                  {zone.name}
                </span>
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-7 w-7 shrink-0", active && "text-white hover:bg-white/15 hover:text-white")}
                disabled={previewMode}
                title="Edit zone"
                onClick={() => {
                  setEditingId(zone.id);
                  setCreating(false);
                  setEditName(zone.name);
                  setEditColor(zone.color);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 shrink-0",
                  active ? "text-white hover:bg-white/15 hover:text-white" : "text-rose-600 hover:bg-rose-50"
                )}
                disabled={previewMode}
                title="Delete zone"
                onClick={() => {
                  const ok = window.confirm(
                    `Delete zone “${zone.name}”? Rows using it will lose this highlight.`
                  );
                  if (ok) onDelete(zone.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorSwatches({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-slate-500">Colour</Label>
      <div className="flex flex-wrap gap-1.5">
        {VENUE_FEATURE_COLOR_PRESETS.map((swatch) => {
          const active = value.toLowerCase() === swatch.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              disabled={disabled}
              aria-label={`Colour ${swatch}`}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition",
                active ? "scale-110 border-slate-900" : "border-white ring-1 ring-slate-200"
              )}
              style={{ background: swatch }}
              onClick={() => onChange(swatch)}
            />
          );
        })}
      </div>
      <Input
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#0B8A83"}
        disabled={disabled}
        className="h-8 w-full cursor-pointer p-1"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
