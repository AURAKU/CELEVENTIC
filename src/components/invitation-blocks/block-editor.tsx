"use client";

import { useState } from "react";
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BlockRenderer } from "@/components/invitation-blocks/block-renderer";
import { BlockPreviewFrame } from "@/components/invitation-blocks/block-preview-frame";
import { STYLE_VARIANTS, BLOCK_TYPE_LABELS } from "@/lib/invitation-blocks/block-types";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";

interface BlockEditorProps {
  orderId: string;
  blocks: InvitationBlockDto[];
  available: { blockType: string; en: string; fr: string; category: string }[];
  context: BlockRenderContext;
  onChange: () => void;
}

export function BlockEditor({ orderId, blocks, available, context, onChange }: BlockEditorProps) {
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop" | "guest">("mobile");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    subtitle: "",
    body: "",
    frTitle: "",
    frContent: "",
    styleVariant: "elegant",
    galleryUrls: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const existingTypes = new Set(blocks.map((b) => b.blockType));
  const addable = available.filter((a) => !existingTypes.has(a.blockType));

  function startEdit(block: InvitationBlockDto) {
    const fr = block.contents?.find((c) => c.language === "fr");
    setEditingId(block.id);
    setEditForm({
      title: block.title ?? "",
      subtitle: block.subtitle ?? "",
      body: block.contentJson?.body ?? fr?.content ?? "",
      frTitle: fr?.title ?? "",
      frContent: fr?.content ?? "",
      styleVariant: block.styleVariant,
      galleryUrls: (block.galleryItems ?? []).map((g) => g.url),
    });
  }

  async function saveEdit(blockId: string) {
    setSaving(true);
    const galleryUrls = editForm.galleryUrls;
    await fetch(`/api/invitation-orders/${orderId}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        subtitle: editForm.subtitle,
        contentJson: { body: editForm.body },
        styleVariant: editForm.styleVariant,
        frTitle: editForm.frTitle,
        frContent: editForm.frContent,
        galleryUrls: galleryUrls.length ? galleryUrls : undefined,
      }),
    });
    setSaving(false);
    setEditingId(null);
    onChange();
  }

  async function toggleVisibility(block: InvitationBlockDto) {
    await fetch(`/api/invitation-orders/${orderId}/blocks/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !block.isVisible }),
    });
    onChange();
  }

  async function removeBlock(blockId: string) {
    if (!confirm("Remove this block?")) return;
    await fetch(`/api/invitation-orders/${orderId}/blocks/${blockId}`, { method: "DELETE" });
    onChange();
  }

  async function moveBlock(blockId: string, direction: "up" | "down") {
    const ids = sorted.map((b) => b.id);
    const idx = ids.indexOf(blockId);
    if (direction === "up" && idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    } else if (direction === "down" && idx < ids.length - 1) {
      [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
    } else return;
    await fetch(`/api/invitation-orders/${orderId}/blocks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockIds: ids }),
    });
    onChange();
  }

  async function addBlock(blockType: string) {
    await fetch(`/api/invitation-orders/${orderId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockType }),
    });
    onChange();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#0F172A]">Sections</h3>
          {addable.length > 0 && (
            <select
              className="text-xs rounded-lg border border-slate-200 px-2 py-1"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addBlock(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">+ Add block</option>
              {addable.map((a) => (
                <option key={a.blockType} value={a.blockType}>{a.en}</option>
              ))}
            </select>
          )}
        </div>

        {sorted.map((block) => (
          <div
            key={block.id}
            className={`rounded-xl border p-4 transition-all ${
              block.isVisible ? "border-slate-200/80 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
            }`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{block.title ?? BLOCK_TYPE_LABELS[block.blockType]?.en}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{block.blockType}</Badge>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => moveBlock(block.id, "up")} className="p-1 hover:bg-slate-100 rounded">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => moveBlock(block.id, "down")} className="p-1 hover:bg-slate-100 rounded">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => toggleVisibility(block)} className="p-1 hover:bg-slate-100 rounded">
                  {block.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                </button>
                <button type="button" onClick={() => startEdit(block)} className="p-1 hover:bg-slate-100 rounded">
                  <Pencil className="h-4 w-4 text-[#0B8A83]" />
                </button>
                <button type="button" onClick={() => removeBlock(block.id)} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>

            {editingId === block.id && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div><Label>Title (EN)</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                <div><Label>Title (FR)</Label><Input value={editForm.frTitle} onChange={(e) => setEditForm({ ...editForm, frTitle: e.target.value })} /></div>
                <div><Label>Subtitle</Label><Input value={editForm.subtitle} onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })} /></div>
                <div><Label>Content</Label><Textarea rows={3} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} /></div>
                <div><Label>Content (FR)</Label><Textarea rows={2} value={editForm.frContent} onChange={(e) => setEditForm({ ...editForm, frContent: e.target.value })} /></div>
                {(block.blockType === "GALLERY" || block.blockType === "MEMORIAL_GALLERY") && (
                  <GalleryUploadPanel
                    urls={editForm.galleryUrls}
                    onChange={(galleryUrls) => setEditForm({ ...editForm, galleryUrls })}
                    maxImages={24}
                  />
                )}
                <div>
                  <Label>Style</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={editForm.styleVariant}
                    onChange={(e) => setEditForm({ ...editForm, styleVariant: e.target.value })}
                  >
                    {STYLE_VARIANTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Button size="sm" onClick={() => saveEdit(block.id)} disabled={saving}>
                  {saving ? "Saving..." : "Save block"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex justify-center gap-2">
          {(["mobile", "desktop", "guest"] as const).map((m) => (
            <Button key={m} size="sm" variant={previewMode === m ? "default" : "outline"} onClick={() => setPreviewMode(m)}>
              {m === "mobile" ? "Mobile" : m === "desktop" ? "Desktop" : "Guest"}
            </Button>
          ))}
        </div>
        <BlockPreviewFrame mode={previewMode}>
          <BlockRenderer blocks={sorted} context={context} previewOnly />
        </BlockPreviewFrame>
      </div>
    </div>
  );
}
