"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Star, Check, X } from "lucide-react";

interface LegacyTemplate { id: string; name: string; category: string; isActive: boolean; config?: { primary?: string; secondary?: string } }
interface DesignTemplateRow {
  id: string; name: string; category: string; style: string; productType: string;
  isPremium: boolean; price: number; isFeatured: boolean; isActive: boolean;
  approvalStatus: string; popularity: number; purchases: number;
}

export function AdminTemplatesClient({ legacyTemplates, designTemplates: initial }: { legacyTemplates: LegacyTemplate[]; designTemplates: DesignTemplateRow[] }) {
  const [designTemplates, setDesignTemplates] = useState(initial);
  const [tab, setTab] = useState<"engine" | "legacy">("engine");

  async function updateTemplate(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/design-templates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const d = await res.json();
      setDesignTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } as DesignTemplateRow : t)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Template Management</h1>
        <Button asChild><Link href="/dashboard/design-studio/builder/new"><Plus className="h-4 w-4" /> Create Template</Link></Button>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={tab === "engine" ? "default" : "ghost"} size="sm" onClick={() => setTab("engine")}>Design Engine ({designTemplates.length})</Button>
        <Button variant={tab === "legacy" ? "default" : "ghost"} size="sm" onClick={() => setTab("legacy")}>Event Themes ({legacyTemplates.length})</Button>
      </div>

      {tab === "engine" && (
        <div className="space-y-4 mt-4">
          <div className="grid gap-4">
            {designTemplates.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{t.name}</h3>
                      <Badge variant="outline">{t.category}</Badge>
                      <Badge variant="outline">{t.productType}</Badge>
                      {t.isPremium && <Badge className="bg-gold-400 text-black">Premium GHS {t.price}</Badge>}
                      {t.isFeatured && <Badge variant="success"><Star className="h-3 w-3" /> Featured</Badge>}
                      <Badge variant={t.approvalStatus === "APPROVED" ? "success" : "warning"}>{t.approvalStatus}</Badge>
                    </div>
                    <p className="text-xs page-subtitle">{t.style} · {t.popularity} uses · {t.purchases} purchases</p>
                  </div>
                  <div className="flex gap-2">
                    {t.approvalStatus === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => updateTemplate(t.id, { approvalStatus: "APPROVED" })}><Check className="h-3 w-3" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateTemplate(t.id, { approvalStatus: "REJECTED" })}><X className="h-3 w-3" /></Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => updateTemplate(t.id, { isFeatured: !t.isFeatured })}>
                      {t.isFeatured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button size="sm" variant="outline" asChild><Link href={`/dashboard/design-studio/builder/${t.id}`}>Edit</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "legacy" && (
        <div className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {legacyTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-24 rounded-lg" style={{ background: `linear-gradient(135deg, ${template.config?.primary ?? "#0D9488"}, ${template.config?.secondary ?? "#D4AF37"})` }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
