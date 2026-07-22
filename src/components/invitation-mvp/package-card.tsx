"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/commerce/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import type { InvitationPackageDef } from "@/lib/invitation-mvp/packages";

interface PackageCardProps {
  pkg: InvitationPackageDef;
  templateSlug: string;
  eventType: string;
  popular?: boolean;
}

export function PackageCard({ pkg, templateSlug, eventType, popular }: PackageCardProps) {
  const { format } = useCurrency();
  const { t } = useLocale();
  const href = `/invitations/create/start?template=${templateSlug}&package=${pkg.slug}&eventType=${eventType}`;

  return (
    <div
      className={`rounded-2xl border bg-white p-6 ${
        popular ? "border-[#0B8A83] shadow-[0_12px_40px_rgba(11,138,131,0.15)] scale-[1.02]" : "border-slate-200/80"
      }`}
    >
      {popular && <Badge className="mb-3 bg-[#D4A63A] text-[#0F172A]">Most Popular</Badge>}
      <h3 className="font-display text-xl font-bold text-[#0F172A]">{pkg.name}</h3>
      <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>
      <div className="mt-4">
        <span className="font-display text-3xl font-bold text-[#0F172A]">
          {pkg.priceGhs === 0 ? t("common.free") : format(pkg.priceGhs)}
        </span>
        {pkg.priceGhs > 0 && (
          <p className="text-xs text-slate-400 mt-1">{t("invitations.base_price_note")}</p>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {t("invitations.revisions_delivery", { revisions: pkg.revisions, days: pkg.deliveryDays })}
      </p>
      <ul className="mt-5 space-y-2">
        {(pkg.features?.length
          ? pkg.features
          : ["Digital invitation", "RSVP", "Guest list", "Share link"]
        )
          .filter((f) => typeof f === "string" && f.trim().length > 0)
          .map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="h-4 w-4 text-[#0B8A83] shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full mt-6 bg-[#0B8A83] hover:bg-[#097068]" asChild>
        <Link href={href}>{t("common.choose")} {pkg.name}</Link>
      </Button>
    </div>
  );
}
