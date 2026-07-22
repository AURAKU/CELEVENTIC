"use client";

import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";

export function TemplateDetailLivePreviewClient({
  template,
  memoryUploadUrl,
  memoryAlbumUrl,
  memoryUploadQrImageUrl,
  memoryEventId,
  memoryAlbumTitle,
}: {
  template: CatalogTemplate;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  memoryUploadQrImageUrl?: string | null;
  memoryEventId?: string | null;
  memoryAlbumTitle?: string | null;
}) {
  return (
    <div className="space-y-3">
      <LiveTemplatePreview
        layoutSlug={template.layoutSlug}
        catalogSlug={template.slug}
        category={template.category}
        features={template.features}
        variant="detail"
        showDeviceToggle
        className="rounded-2xl border border-slate-200/80 shadow-inner"
        memoryUploadUrl={memoryUploadUrl}
        memoryAlbumUrl={memoryAlbumUrl}
        memoryUploadQrImageUrl={memoryUploadQrImageUrl}
        memoryEventId={memoryEventId}
        memoryAlbumTitle={memoryAlbumTitle}
      />
      <p className="text-center text-xs text-slate-500">
        Tap the preview above to open the full guest experience with sample event details
        {template.features.includes("Music") ? " and music controls" : ""}.
      </p>
    </div>
  );
}
