import { ensureDemoMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { TemplateDetailLivePreviewClient } from "@/components/invitation-mvp/template-detail-live-preview-client";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { isAureliaEditorialLayout, withAureliaAlbumQrCenter } from "@/lib/experience/aurelia-editorial";

export async function TemplateDetailLivePreview({ template }: { template: CatalogTemplate }) {
  // Demo memory links are optional, never 500 the template detail page if DB is busy.
  const memoryLinks = await ensureDemoMemoryLinks(template.name).catch(() => null);

  return (
    <TemplateDetailLivePreviewClient
      template={template}
      memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
      memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
      memoryUploadQrImageUrl={
        isAureliaEditorialLayout(template.layoutSlug)
          ? withAureliaAlbumQrCenter(memoryLinks?.uploadQrImageUrl)
          : memoryLinks?.uploadQrImageUrl ?? null
      }
      memoryEventId={memoryLinks?.eventId ?? null}
      memoryAlbumTitle={memoryLinks?.eventTitle ?? template.name}
    />
  );
}
