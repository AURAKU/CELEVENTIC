import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { getTemplatePreset } from "@/lib/invitation-templates";

/** Static poster gradient for catalogue thumbnails — no live invite mounted. */
export function resolveTemplatePosterGradient(layoutSlug: string): string {
  const catalog = CATALOG_TEMPLATES.find(
    (t) => t.layoutSlug === layoutSlug || t.slug === layoutSlug
  );
  if (catalog?.previewGradient) {
    return catalog.previewGradient.includes("from-")
      ? catalog.previewGradient
      : `from-slate-100 ${catalog.previewGradient}`;
  }
  const preset = getTemplatePreset(layoutSlug);
  return preset?.preview?.gradient ?? "from-slate-200 via-slate-100 to-white";
}
