import { notFound, redirect } from "next/navigation";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { categoryForBlueprint } from "@/lib/invite-blueprints/blueprint-registry";
import { getSampleEvent, getSampleInvitation } from "@/lib/invite-blueprints/sample-data";
import { FUNERAL_THEME_IDS, WEDDING_THEME_IDS } from "@/lib/invitation-theme/theme-registry";
import { TemplatePreviewShell } from "@/components/invitation-paged/template-preview-shell";

export const dynamic = "force-dynamic";

/**
 * Live template preview — the real paged viewer over sample data, with theme
 * switcher chips and a pinned "Use this template" CTA. Legacy (non-paged)
 * templates keep their existing detail page.
 */
export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getCatalogTemplate(slug);
  if (!template) notFound();
  if (!template.themeId || !template.blueprintId) {
    redirect(`/invitations/templates/${template.slug}`);
  }

  const design = getDefaultDesignConfig(template.slug);
  const category = categoryForBlueprint(template.blueprintId);
  const themeIds = category === "funeral" ? FUNERAL_THEME_IDS : WEDDING_THEME_IDS;

  return (
    <TemplatePreviewShell
      templateSlug={template.slug}
      templateName={template.name}
      tier={template.tier ?? (template.isPremium ? "premium" : "free")}
      design={design}
      event={getSampleEvent(category)}
      invitation={getSampleInvitation(template.slug)}
      category={category}
      themeIds={themeIds}
      eventType={category === "funeral" ? "FUNERAL" : "WEDDING"}
    />
  );
}
