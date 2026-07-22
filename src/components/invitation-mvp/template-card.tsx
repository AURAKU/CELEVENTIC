import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getLayoutSignatureFeatures } from "@/lib/invitation/layout-template-signatures";

interface TemplateCardProps {
  template: CatalogTemplate;
  showActions?: boolean;
}

const FEATURE_ICONS: Record<string, string> = {
  RSVP: "✓",
  QR: "⬡",
  Music: "♪",
  Gallery: "◫",
  Countdown: "⏱",
  Maps: "📍",
  Calendar: "📅",
  "Guest Wishes": "♥",
  Seating: "◉",
  Story: "✦",
};

export function TemplateCard({ template, showActions = true }: TemplateCardProps) {
  const signatureFeatures =
    getLayoutSignatureFeatures(template.layoutSlug) ?? template.features;
  // Studio 2.0 paged templates open the real viewer in preview mode.
  const isPaged = Boolean(template.themeId && template.blueprintId);
  const detailHref = isPaged
    ? `/invitations/preview/${template.slug}`
    : `/invitations/templates/${template.slug}`;

  return (
    <div className="group inv-3d-card rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all">
      <LiveTemplatePreview
        layoutSlug={template.layoutSlug}
        catalogSlug={template.slug}
        category={template.category}
        features={signatureFeatures}
        variant="card"
      />
      <div className="p-5 relative">
        <div className="absolute -top-3 right-4 flex gap-1.5">
          {template.isNew && (
            <Badge className="bg-emerald-500 text-white shadow-sm">New</Badge>
          )}
          {template.tier === "free" && (
            <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Free</Badge>
          )}
          {(template.isPremium || template.tier === "premium") && (
            <Badge className="bg-[#D4A63A] text-[#0F172A]">Premium</Badge>
          )}
          {template.hasParallax && (
            <Badge className="bg-[#0B8A83] text-white" title="Includes parallax motion">
              <Sparkles className="h-3 w-3" aria-hidden />
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0B8A83]">{template.category}</p>
          {template.mood && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{template.mood}</span>
          )}
        </div>
        <p className="font-semibold text-[#0F172A] mt-1">{template.name}</p>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
        <p className="text-xs text-slate-400 mt-2">{template.style} style</p>
        {signatureFeatures.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {signatureFeatures.slice(0, 6).map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
              >
                {FEATURE_ICONS[f] && <span aria-hidden>{FEATURE_ICONS[f]}</span>}
                {f}
              </span>
            ))}
            {signatureFeatures.length > 6 && (
              <span className="text-[10px] text-slate-400 px-1">+{signatureFeatures.length - 6}</span>
            )}
          </div>
        )}
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={detailHref}>Preview</Link>
            </Button>
            <Button size="sm" className="flex-1 bg-[#0B8A83] hover:bg-[#097068]" asChild>
              <Link href={detailHref}>Select</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
