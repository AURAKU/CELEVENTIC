"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getLayoutSignatureFeatures } from "@/lib/invitation/layout-template-signatures";
import type { InvitationTemplatePreset } from "@/lib/invitation-templates";

export function LiveCatalogTemplateGrid({ templates }: { templates: CatalogTemplate[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => {
        const features =
          getLayoutSignatureFeatures(template.layoutSlug) ?? template.features;
        return (
          <div
            key={template.slug}
            className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all"
          >
            <LiveTemplatePreview
              layoutSlug={template.layoutSlug}
              category={template.category}
              features={features}
              variant="card"
            />
            <div className="p-5 relative">
              {template.isPremium && (
                <Badge className="absolute -top-3 right-4 bg-[#D4A63A] text-[#0F172A]">Premium</Badge>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0B8A83]">{template.category}</p>
              <p className="font-semibold text-[#0F172A] mt-1">{template.name}</p>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
              <p className="text-xs text-slate-400 mt-2">{template.style} style</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/invitations/templates/${template.slug}`}>Preview</Link>
                </Button>
                <Button size="sm" className="flex-1 bg-[#0B8A83] hover:bg-[#097068]" asChild>
                  <Link href={`/invitations/templates/${template.slug}`}>Select</Link>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LivePresetTemplateGrid({
  presets,
  linkHref,
}: {
  presets: InvitationTemplatePreset[];
  linkHref?: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {presets.map((template) => (
        <div
          key={template.slug}
          className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white hover:shadow-lg transition-shadow"
        >
          <LiveTemplatePreview
            layoutSlug={template.slug}
            category={template.category}
            variant="card"
          />
          <div className="p-5">
            <p className="text-xs uppercase tracking-wider text-brand-600">{template.category}</p>
            <p className="font-semibold text-slate-900 mt-1">{template.name}</p>
            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{template.description}</p>
            {linkHref && (
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link href={linkHref}>Use this layout</Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
