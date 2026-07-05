"use client";

import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";

export function TemplateDetailLivePreview({ template }: { template: CatalogTemplate }) {
  return (
    <div className="space-y-3">
      <LiveTemplatePreview
        layoutSlug={template.layoutSlug}
        category={template.category}
        features={template.features}
        variant="detail"
        showDeviceToggle
        className="rounded-2xl border border-slate-200/80 shadow-inner"
      />
      <p className="text-center text-xs text-slate-500">
        Tap the preview above to open the full guest experience with sample event details
        {template.features.includes("Music") ? " and music controls" : ""}.
      </p>
    </div>
  );
}
