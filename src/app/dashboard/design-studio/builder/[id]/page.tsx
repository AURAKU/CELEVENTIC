"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TemplateBuilder } from "@/components/template-engine/template-builder";
import { createWeddingLuxuryTemplate } from "@/lib/default-template-schemas";
import type { TemplateSchema, TemplateBlock } from "@/types/template-engine";
import { ArrowLeft } from "lucide-react";

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [schema, setSchema] = useState<TemplateSchema | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === "new") {
      setSchema(createWeddingLuxuryTemplate());
      return;
    }
    fetch(`/api/design-templates/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const t = d.data;
          setSchema({
            name: t.name,
            category: t.category,
            style: t.style,
            productType: t.productType,
            canvas: t.canvas,
            blocks: t.blocks as TemplateBlock[],
            colorPalette: t.colorPalette,
            fontPairing: t.fontPairing,
            variables: t.variables,
          });
        }
      });
  }, [id]);

  async function handleSave(updated: TemplateSchema) {
    setSaving(true);
    if (id === "new") {
      const res = await fetch("/api/design-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schema: updated }) });
      const d = await res.json();
      if (res.ok && d.data?.id) window.location.href = `/dashboard/design-studio/builder/${d.data.id}`;
    } else {
      await fetch(`/api/design-templates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: updated.name, blocks: updated.blocks, canvas: updated.canvas, colorPalette: updated.colorPalette, fontPairing: updated.fontPairing }) });
    }
    setSaving(false);
  }

  async function handleDuplicate() {
    if (id === "new") return;
    const res = await fetch(`/api/design-templates/${id}/duplicate`, { method: "POST" });
    const d = await res.json();
    if (res.ok && d.data?.id) window.location.href = `/dashboard/design-studio/builder/${d.data.id}`;
  }

  if (!schema) return <p className="text-center py-12 text-slate-500">Loading builder...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/design-studio"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">Template Builder</h1>
      </div>
      <TemplateBuilder initialSchema={schema} onSave={handleSave} onDuplicate={id !== "new" ? handleDuplicate : undefined} saving={saving} />
    </div>
  );
}
