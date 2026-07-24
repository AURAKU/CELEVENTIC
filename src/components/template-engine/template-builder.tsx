"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateCanvas } from "./template-canvas";
import type { TemplateBlock, TemplateBlockType, TemplateSchema } from "@/types/template-engine";
import { TEMPLATE_VARIABLES } from "@/types/template-engine";
import { Save, Copy, Eye, Smartphone, Plus, Trash2 } from "lucide-react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";

interface TemplateBuilderProps {
  initialSchema: TemplateSchema;
  onSave: (schema: TemplateSchema) => Promise<void>;
  onDuplicate?: () => void;
  saving?: boolean;
}

const FONT_OPTIONS = ["Inter", "Playfair Display", "Cinzel", "Cormorant Garamond", "Great Vibes"];

const SAMPLE_CONTEXT = {
  event_title: "Chelsy & Owuraku Wedding",
  host_name: "The Owusu Family",
  event_date: "Saturday, 14 June 2026",
  event_time: "2:30 PM",
  venue: "Royal Palm Events Centre",
  landmark: "East Legon, Accra",
  guest_name: "Kwame Mensah",
  qr_code: "https://celeventic.com/invite/sample",
  rsvp_link: "https://celeventic.com/rsvp/sample",
};

const BLOCK_TYPES: { type: TemplateBlockType; label: string; defaults: Partial<TemplateBlock> }[] = [
  { type: "text", label: "Text", defaults: { fontSize: 28, color: "#FFFFFF", align: "center", x: 540, y: 400 } },
  { type: "image", label: "Image", defaults: { width: 200, height: 200, x: 100, y: 100 } },
  { type: "logo", label: "Logo", defaults: { width: 120, height: 120, x: 80, y: 80 } },
  { type: "qr", label: "QR Code", defaults: { size: 140, x: 820, y: 1080 } },
  { type: "rsvp_button", label: "RSVP Button", defaults: { width: 240, height: 50, x: 540, y: 900 } },
  { type: "divider", label: "Divider", defaults: { width: 200, height: 2, color: "#FBBF24", x: 440, y: 500 } },
  { type: "frame", label: "Frame", defaults: { width: 980, height: 1250, color: "#FBBF24", x: 50, y: 50 } },
  { type: "pattern_overlay", label: "Pattern", defaults: { width: 1080, height: 80, color: "#B45309", x: 0, y: 0 } },
];

export function TemplateBuilder({ initialSchema, onSave, onDuplicate, saving }: TemplateBuilderProps) {
  const [schema, setSchema] = useState<TemplateSchema>(initialSchema);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const selected = schema.blocks.find((b) => b.id === selectedId);

  function updateBlock(id: string, patch: Partial<TemplateBlock>) {
    setSchema({
      ...schema,
      blocks: schema.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  function updateCanvas(patch: Partial<TemplateSchema["canvas"]>) {
    setSchema({ ...schema, canvas: { ...schema.canvas, ...patch } });
  }

  function addBlock(type: TemplateBlockType) {
    const def = BLOCK_TYPES.find((b) => b.type === type)!;
    const id = `b-${Date.now().toString(36)}`;
    const newBlock: TemplateBlock = {
      id,
      type,
      key: `${type}_${schema.blocks.length + 1}`,
      x: def.defaults.x ?? 100,
      y: def.defaults.y ?? 100,
      zIndex: schema.blocks.length + 1,
      ...def.defaults,
    };
    setSchema({ ...schema, blocks: [...schema.blocks, newBlock] });
    setSelectedId(id);
  }

  function removeBlock(id: string) {
    setSchema({ ...schema, blocks: schema.blocks.filter((b) => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave() {
    setSaveMsg("");
    try {
      await onSave(schema);
      setSaveMsg("Saved successfully!");
    } catch {
      setSaveMsg("Save failed — try again.");
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <div>
          <Label>Template Name</Label>
          <Input value={schema.name} onChange={(e) => setSchema({ ...schema, name: e.target.value })} />
        </div>
        <div>
          <Label>Background</Label>
          <Input value={schema.canvas.background} onChange={(e) => updateCanvas({ background: e.target.value })} />
        </div>
        <div>
          <Label>Background image</Label>
          <ImageUploadCropper
            defaultAspect="free"
            buttonLabel="Import background"
            hint="Upload and crop a background image from your device."
            previewUrl={schema.canvas.backgroundImage ?? null}
            onClear={() => updateCanvas({ backgroundImage: undefined })}
            onUploaded={(r) => updateCanvas({ backgroundImage: r.url })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((b) => (
            <Button key={b.type} type="button" variant="outline" size="sm" onClick={() => addBlock(b.type)}>
              <Plus className="h-3 w-3" /> {b.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          <Label>Blocks ({schema.blocks.length})</Label>
          {schema.blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={`flex-1 text-left p-2 rounded border text-sm ${selectedId === b.id ? "border-brand-500 bg-brand-50" : ""}`}
              >
                <span className="font-medium capitalize">{b.type}</span> — {b.key}
              </button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeBlock(b.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {selected && (
          <div className="space-y-3 p-3 border rounded-xl bg-white/80">
            <p className="text-sm font-semibold">Edit: {selected.key}</p>
            <Input value={selected.key} onChange={(e) => updateBlock(selected.id, { key: e.target.value })} placeholder="Block key" />
            {selected.type === "text" && (
              <>
                <Input value={selected.content ?? ""} placeholder="Static text" onChange={(e) => updateBlock(selected.id, { content: e.target.value })} />
                <Select value={selected.variable ?? ""} onValueChange={(v) => updateBlock(selected.id, { variable: v })}>
                  <SelectTrigger><SelectValue placeholder="Or use variable" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {TEMPLATE_VARIABLES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selected.font ?? "Inter"} onValueChange={(v) => updateBlock(selected.id, { font: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" value={selected.fontSize ?? 24} onChange={(e) => updateBlock(selected.id, { fontSize: parseInt(e.target.value) })} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Color</Label>
                  <input type="color" value={selected.color ?? "#ffffff"} onChange={(e) => updateBlock(selected.id, { color: e.target.value })} className="h-8 w-12 rounded cursor-pointer" />
                  <Input value={selected.color ?? "#ffffff"} onChange={(e) => updateBlock(selected.id, { color: e.target.value })} className="flex-1" />
                </div>
              </>
            )}
            {(selected.type === "image" || selected.type === "logo") && (
              <ImageUploadCropper
                defaultAspect="free"
                buttonLabel={selected.type === "logo" ? "Upload logo" : "Upload image"}
                hint="Import from device, then crop to frame."
                previewUrl={selected.content ?? null}
                onClear={() => updateBlock(selected.id, { content: undefined })}
                onUploaded={(r) => updateBlock(selected.id, { content: r.url })}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X</Label>
                <Input type="number" value={selected.x} onChange={(e) => updateBlock(selected.id, { x: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Y</Label>
                <Input type="number" value={selected.y} onChange={(e) => updateBlock(selected.id, { y: parseInt(e.target.value) })} />
              </div>
            </div>
            {(selected.type === "qr") && (
              <Input type="number" value={selected.size ?? 120} onChange={(e) => updateBlock(selected.id, { size: parseInt(e.target.value) })} placeholder="QR size" />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
          {onDuplicate && (
            <Button variant="outline" onClick={onDuplicate}><Copy className="h-4 w-4" /></Button>
          )}
        </div>
        {saveMsg && <p className="text-xs text-center text-brand-600">{saveMsg}</p>}
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Live Preview</h3>
          <Button variant="ghost" size="sm" onClick={() => setMobilePreview(!mobilePreview)}>
            <Smartphone className="h-4 w-4" /> {mobilePreview ? "Desktop" : "Mobile"}
          </Button>
        </div>
        <div className={`flex justify-center p-6 rounded-xl ${mobilePreview ? "bg-slate-900" : "bg-slate-100"}`}>
          <TemplateCanvas
            canvas={schema.canvas}
            blocks={schema.blocks}
            context={SAMPLE_CONTEXT}
            scale={mobilePreview ? 0.28 : 0.38}
            interactive
            onSelectBlock={setSelectedId}
            selectedBlockId={selectedId ?? undefined}
            onDragBlock={(id, x, y) => updateBlock(id, { x, y })}
          />
        </div>
        <p className="text-xs text-slate-500 text-center">
          Canvas: {schema.canvas.width}×{schema.canvas.height}px · Drag blocks to reposition · Click to edit
        </p>
      </div>
    </div>
  );
}
