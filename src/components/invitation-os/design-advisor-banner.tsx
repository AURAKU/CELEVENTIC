"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { AGI_COPY } from "@/lib/agi-engine/branding";

interface DesignAdvisorBannerProps {
  eventType: string;
  guestCount?: number;
  budgetGhs?: number;
}

export function DesignAdvisorBanner({ eventType, guestCount, budgetGhs }: DesignAdvisorBannerProps) {
  const [data, setData] = useState<{
    recommendedPackage: { slug: string; name: string; reason: string };
    recommendedTemplates: { slug: string; name: string; reason?: string }[];
    suggestedAddons: { slug: string; name: string; reason?: string }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/invitation-os/design-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, guestCount, budgetGhs }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); });
  }, [eventType, guestCount, budgetGhs]);

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-[#0B8A83]/20 bg-[#0B8A83]/5 p-4 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-2 text-[#0B8A83]">
        <Lightbulb className="h-4 w-4" /> {AGI_COPY.suggest}
      </p>
      <p className="text-xs text-slate-600">
        Recommended: <strong>{data.recommendedPackage.name}</strong> — {data.recommendedPackage.reason}
      </p>
      <div className="flex flex-wrap gap-1">
        {data.recommendedTemplates.slice(0, 3).map((t) => (
          <Badge key={t.slug} variant="outline" className="text-xs">{t.name}</Badge>
        ))}
      </div>
      {data.suggestedAddons.length > 0 && (
        <p className="text-xs text-slate-500">
          Suggested add-ons: {data.suggestedAddons.map((a) => a.name).join(", ")}
        </p>
      )}
    </div>
  );
}
