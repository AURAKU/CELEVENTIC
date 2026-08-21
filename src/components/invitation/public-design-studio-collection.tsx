"use client";

import Link from "next/link";
import { ArrowUpRight, Palette, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationLinks } from "@/components/ui/pagination";
import { TemplateCanvas } from "@/components/template-engine/template-canvas";
import { withoutCatalogDashes } from "@/lib/invitation-mvp/catalog-public-copy";
import type { TemplateBlock, TemplateCanvas as CanvasType, TemplateRenderContext } from "@/types/template-engine";

export type PublicDesignStudioItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  style: string;
  description: string | null;
  productType: string;
  isPremium: boolean;
  isFeatured: boolean;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  canvas: CanvasType;
  blocks: TemplateBlock[];
};

function displayCategory(category: string): string {
  if (category === "Engagement") return "Wedding";
  return category;
}

function productLabel(productType: string): string {
  const map: Record<string, string> = {
    INVITATION: "Invitation",
    FLYER: "Flyer",
    TICKET: "Ticket",
    BUSINESS_CARD: "Business card",
    COMPLIMENTARY_CARD: "Card",
    SOCIAL_POST: "Social",
  };
  return map[productType] ?? productType.replace(/_/g, " ").toLowerCase();
}

function sampleContext(category: string, name: string): TemplateRenderContext {
  const cat = displayCategory(category).toLowerCase();
  if (cat.includes("funeral") || cat.includes("memorial")) {
    return {
      event_title: "In Loving Memory",
      host_name: "The Mensah Family",
      event_date: "Saturday, 14 June",
      event_time: "10:00 AM",
      venue: "Holy Trinity Cathedral",
      landmark: "Accra",
      guest_name: "Beloved Guest",
      dress_code: "Dark colours",
    };
  }
  if (cat.includes("birthday")) {
    return {
      event_title: "Birthday Celebration",
      host_name: "Nia Adom",
      event_date: "Saturday, 14 June",
      event_time: "7:00 PM",
      venue: "Skyline Rooftop",
      landmark: "Accra",
      guest_name: "Alex",
      dress_code: "Smart festive",
    };
  }
  if (cat.includes("business")) {
    return {
      event_title: "Founder & Creative Director",
      host_name: "Ama Mensah",
      event_date: "Accra · GH",
      event_time: "",
      venue: "Celeventic",
      landmark: "Accra",
      guest_name: "Contact",
      dress_code: "",
    };
  }
  if (cat.includes("ticket") || name.toLowerCase().includes("ticket") || name.toLowerCase().includes("pass") || name.toLowerCase().includes("badge")) {
    const lower = name.toLowerCase();
    if (lower.includes("concert")) {
      return {
        event_title: "Afrobeats Live Night",
        host_name: "Celeventic Live",
        event_date: "Sat, 20 June",
        event_time: "9:00 PM",
        venue: "National Theatre Accra",
        landmark: "Accra",
        guest_name: "Kwame Boateng",
        ticket_type: "GA Floor",
      };
    }
    if (lower.includes("comedy")) {
      return {
        event_title: "Laugh Accra Comedy Night",
        host_name: "Stage Lights GH",
        event_date: "Fri, 12 June",
        event_time: "8:00 PM",
        venue: "Alliance Française",
        landmark: "Accra",
        guest_name: "Nia Adom",
        ticket_type: "Reserved Seat",
      };
    }
    if (lower.includes("sport") || lower.includes("match")) {
      return {
        event_title: "Hearts vs Kotoko Derby",
        host_name: "Ghana Premier League",
        event_date: "Sun, 28 June",
        event_time: "4:00 PM",
        venue: "Accra Sports Stadium",
        landmark: "Accra",
        guest_name: "Yaw Mensah",
        ticket_type: "East Stand",
      };
    }
    if (lower.includes("launch") || lower.includes("product")) {
      return {
        event_title: "Nova Phone Launch",
        host_name: "Aura Tech",
        event_date: "Thu, 18 June",
        event_time: "6:30 PM",
        venue: "Kempinski Accra",
        landmark: "Accra",
        guest_name: "Ama Mensah",
        ticket_type: "VIP Guest",
      };
    }
    if (lower.includes("festival")) {
      return {
        event_title: "Coastal Beats Festival",
        host_name: "Celeventic Festivals",
        event_date: "19–21 June",
        event_time: "Gates 2 PM",
        venue: "Labadi Beach Park",
        landmark: "Accra",
        guest_name: "Kofi Asante",
        ticket_type: "3-Day Pass",
      };
    }
    if (lower.includes("conference") || lower.includes("badge")) {
      return {
        event_title: "Africa Growth Summit",
        host_name: "Celeventic Events",
        event_date: "14–15 June",
        event_time: "8:30 AM",
        venue: "Mövenpick Accra",
        landmark: "Accra",
        guest_name: "Delegate",
        ticket_type: "Full Access",
      };
    }
    if (lower.includes("church") || lower.includes("program")) {
      return {
        event_title: "Anniversary Thanksgiving",
        host_name: "Parish Events Board",
        event_date: "Sunday, 21 June",
        event_time: "9:00 AM",
        venue: "Calvary Methodist Church",
        landmark: "Accra",
        guest_name: "Beloved Guest",
        ticket_type: "Reserved Seat",
      };
    }
    return {
      event_title: "Gala Night Admission",
      host_name: "Celeventic Events",
      event_date: "14 June 2026",
      event_time: "7:00 PM",
      venue: "Kempinski Accra",
      landmark: "Accra",
      guest_name: "VIP Guest",
      ticket_type: "VIP Pass",
    };
  }
  if (cat.includes("corporate")) {
    return {
      event_title: "Leadership Summit",
      host_name: "Celeventic Events",
      event_date: "14 June 2026",
      event_time: "9:00 AM",
      venue: "Kempinski Accra",
      landmark: "Accra",
      guest_name: "Delegate",
      ticket_type: "VIP Pass",
      dress_code: "Business formal",
    };
  }
  if (cat.includes("church")) {
    return {
      event_title: "Church Celebration",
      host_name: "Parish Events Board",
      event_date: "Sunday, 15 June",
      event_time: "11:00 AM",
      venue: "Calvary Methodist Church",
      landmark: "Accra",
      guest_name: "Friend",
      dress_code: "Sunday best",
    };
  }
  return {
    event_title: "Amara & Kwame",
    host_name: "Amara Mensah & Kwame Osei",
    event_date: "Saturday, 14 June",
    event_time: "2:00 PM",
    venue: "Royal Palm Events Centre",
    landmark: "East Legon, Accra",
    guest_name: "Treasured Guest",
    dress_code: "Formal · Earth tones welcome",
  };
}

function canvasScale(canvas: CanvasType): number {
  const w = canvas?.width || 1080;
  const h = canvas?.height || 1350;
  // Fit inside a ~280×200 preview well
  const scaleW = 280 / w;
  const scaleH = 200 / h;
  return Math.min(scaleW, scaleH, 0.28);
}

export function PublicDesignStudioCollection({
  templates,
  page,
  pages,
  total,
  limit,
}: {
  templates: PublicDesignStudioItem[];
  page: number;
  pages: number;
  total: number;
  limit: number;
}) {
  if (templates.length === 0) return null;

  return (
    <section className="mt-20 border-t border-slate-200/80 pt-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[#0B8A83] mb-2">
            <Palette className="h-4 w-4" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Design Studio</p>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Print ready studio layouts
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Drag and drop invitations, flyers, tickets and cards in Design Studio. Distinct from the
            cinematic guest experiences above, these layouts are built for export and print.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-[#0B8A83]/30 text-[#0B8A83] hover:bg-[#0B8A83]/5"
        >
          <Link href="/auth/register?next=/dashboard/design-studio">
            Open Design Studio
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {templates.map((t) => {
          const category = displayCategory(t.category);
          const name = withoutCatalogDashes(t.name);
          const style = withoutCatalogDashes(t.style);
          const description = withoutCatalogDashes(
            t.description?.trim() || `${style} ${productLabel(t.productType)} for ${category.toLowerCase()} events.`
          );
          const scale = canvasScale(t.canvas);
          const context = sampleContext(t.category, t.name);
          const hasThumb = Boolean(t.thumbnailUrl || t.previewUrl);
          const thumb = t.thumbnailUrl || t.previewUrl;

          return (
            <article
              key={t.id}
              className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all flex flex-col"
            >
              <div className="relative h-[200px] bg-[#eceae6] border-b border-slate-200/60 overflow-hidden flex items-center justify-center">
                {hasThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-3 pointer-events-none">
                    <TemplateCanvas
                      canvas={t.canvas}
                      blocks={Array.isArray(t.blocks) ? t.blocks : []}
                      context={context}
                      scale={scale}
                    />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                    {productLabel(t.productType)}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  {t.isFeatured && (
                    <Badge className="bg-[#D4A63A] text-[#0F172A] shadow-sm">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {t.isPremium && (
                    <Badge className="bg-[#0B8A83] text-white shadow-sm">Premium</Badge>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0B8A83]">
                  {category}
                </p>
                <h3 className="font-semibold text-[#0F172A] mt-1 leading-snug">{name}</h3>
                <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 flex-1">{description}</p>
                <p className="text-xs text-slate-400 mt-2">{style} style</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/auth/register?next=/dashboard/design-studio/templates`}>
                      Preview
                    </Link>
                  </Button>
                  <Button size="sm" className="flex-1 bg-[#0B8A83] hover:bg-[#097068]" asChild>
                    <Link href={`/auth/register?next=/dashboard/design-studio/builder/${t.id}`}>
                      Use layout
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="mt-8">
          <PaginationLinks
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            basePath="/templates"
          />
        </div>
      )}
    </section>
  );
}
