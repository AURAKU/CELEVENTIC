"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemplateCanvas } from "@/components/template-engine/template-canvas";
import type { TemplateSchema } from "@/types/template-engine";
import { Download, ArrowLeft, ExternalLink } from "lucide-react";

interface GeneratedDesign {
  id: string;
  name: string;
  productType: string;
  config: TemplateSchema;
  eventId: string;
  templateId: string | null;
}

export default function GeneratedDesignsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading designs…</p>}>
      <GeneratedDesignsPageInner />
    </Suspense>
  );
}

function GeneratedDesignsPageInner() {
  const eventId = useSearchParams().get("eventId");
  const [designs, setDesigns] = useState<GeneratedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    const url = new URL("/api/design-templates/generated", window.location.origin);
    if (eventId) url.searchParams.set("eventId", eventId);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => { if (d.success) setDesigns(d.data); })
      .finally(() => setLoading(false));
  }, [eventId]);

  async function exportDesign(design: GeneratedDesign, format: string) {
    setExporting(design.id);
    const res = await fetch("/api/design-templates/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        designId: design.id,
        eventId: design.eventId,
        templateId: design.templateId,
        format,
        config: design.config,
      }),
    });
    const d = await res.json();
    setExporting("");
    if (res.ok && d.data?.downloadUrl) {
      window.open(d.data.downloadUrl, "_blank");
    } else {
      alert(d.error ?? d.data?.message ?? "Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/design-studio/templates"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="page-heading">Generated Design Suite</h1>
          <p className="page-subtitle">Invitation, flyer, ticket, and social formats from your event</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-12">Loading designs...</p>
      ) : designs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Generate designs from the{" "}
            <Link href="/dashboard/design-studio/templates" className="text-brand-600 font-semibold underline">
              Template Library
            </Link>{" "}
            with an event selected.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((d) => (
            <Card key={d.id} className="card-glow">
              <div className="bg-slate-100 p-3 flex justify-center">
                <TemplateCanvas canvas={d.config.canvas} blocks={d.config.blocks} scale={0.15} />
              </div>
              <CardContent className="p-4 space-y-3">
                <Badge variant="outline">{d.productType.replace(/_/g, " ")}</Badge>
                <h3 className="font-medium text-sm">{d.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exporting === d.id}
                    onClick={() => exportDesign(d, "PNG")}
                  >
                    <Download className="h-3 w-3" /> SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exporting === d.id}
                    onClick={() => exportDesign(d, "PDF")}
                  >
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                  {d.productType === "INVITATION" && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/invitations?eventId=${d.eventId}`}>
                        <ExternalLink className="h-3 w-3" /> Share
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
