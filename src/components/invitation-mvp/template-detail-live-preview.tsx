import { ensureDemoMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { TemplateDetailLivePreviewClient } from "@/components/invitation-mvp/template-detail-live-preview-client";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";

export async function TemplateDetailLivePreview({ template }: { template: CatalogTemplate }) {
  const memoryLinks = await ensureDemoMemoryLinks(template.name);

  return (
    <TemplateDetailLivePreviewClient
      template={template}
      memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
      memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
      memoryUploadQrImageUrl={memoryLinks?.uploadQrImageUrl ?? null}
      memoryEventId={memoryLinks?.eventId ?? null}
      memoryAlbumTitle={memoryLinks?.eventTitle ?? template.name}
    />
  );
}
