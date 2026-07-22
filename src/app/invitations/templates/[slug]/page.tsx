import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { TemplateDetailLivePreview } from "@/components/invitation-mvp/template-detail-live-preview";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { PackageCard } from "@/components/invitation-mvp/package-card";
import { TemplatePackageHeading } from "@/components/invitation-mvp/template-package-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { catalogService } from "@/services/commerce/catalog.service";
import { EVENT_TYPES } from "@/lib/constants";

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventType?: string }>;
}) {
  const { slug } = await params;
  const { eventType: eventTypeParam } = await searchParams;
  const template = getCatalogTemplate(slug);
  if (!template) notFound();

  const eventType = eventTypeParam ?? "WEDDING";
  const packages = await catalogService.getActivePackages(eventType);

  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-[#FAF8F4] py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-10 mb-16">
            <div>
              <TemplateDetailLivePreview template={template} />
            </div>
            <div>
              <Badge className="mb-3">{template.category}</Badge>
              <h1 className="font-display text-3xl font-bold text-[#0F172A]">{template.name}</h1>
              <p className="mt-3 text-slate-600">{template.description}</p>
              <p className="text-sm text-slate-400 mt-2">{template.style} style</p>
              <ul className="mt-6 space-y-2">
                {template.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-[#0B8A83]" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {EVENT_TYPES.slice(0, 6).map((et) => (
                  <Link
                    key={et.value}
                    href={`/invitations/templates/${slug}?eventType=${et.value}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium border ${
                      eventType === et.value
                        ? "bg-[#0B8A83] text-white border-[#0B8A83]"
                        : "border-slate-200 text-slate-600 hover:border-[#0B8A83]"
                    }`}
                  >
                    {et.label}
                  </Link>
                ))}
              </div>
              <Button className="mt-8 bg-[#0B8A83] hover:bg-[#097068]" size="lg" asChild>
                <Link href={`/invitations/create/start?template=${slug}&package=celebration&eventType=${eventType}`}>
                  Start My Invitation
                </Link>
              </Button>
            </div>
          </div>

          <TemplatePackageHeading />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.slug}
                pkg={pkg}
                templateSlug={slug}
                eventType={eventType}
                popular={pkg.slug === "signature"}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
