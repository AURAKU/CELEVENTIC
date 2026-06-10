import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogTemplate } from "@/lib/invitation-mvp/catalogue";

interface TemplateCardProps {
  template: CatalogTemplate;
  showActions?: boolean;
}

export function TemplateCard({ template, showActions = true }: TemplateCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all">
      <div className={`h-44 bg-gradient-to-br ${template.previewGradient} relative`}>
        {template.isPremium && (
          <Badge className="absolute top-3 right-3 bg-[#D4A63A] text-[#0F172A]">Premium</Badge>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0B8A83]">{template.category}</p>
        <p className="font-semibold text-[#0F172A] mt-1">{template.name}</p>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
        <p className="text-xs text-slate-400 mt-2">{template.style} style</p>
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/invitations/templates/${template.slug}`}>Preview</Link>
            </Button>
            <Button size="sm" className="flex-1 bg-[#0B8A83] hover:bg-[#097068]" asChild>
              <Link href={`/invitations/templates/${template.slug}`}>Select</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
