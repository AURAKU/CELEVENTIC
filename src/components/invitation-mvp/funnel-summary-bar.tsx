"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { useCurrency } from "@/components/commerce/currency-provider";

interface PricingData {
  totalGhs: number;
  lineItems?: { name: string; amountGhs: number }[];
}

interface FunnelSummaryBarProps {
  packageSlug?: string | null;
  packageName?: string | null;
  /** Live add-on selection (addons step) or the order's saved slugs */
  addonSlugs?: string[];
}

/**
 * Persistent, non-obstructive order summary for the personalization funnel.
 * Never surprise the user at checkout: the running total follows them from
 * details through sections and extras. Fetches the same pricing engine the
 * checkout uses — one source of truth.
 */
export function FunnelSummaryBar({ packageSlug, packageName, addonSlugs = [] }: FunnelSummaryBarProps) {
  const { format, currency } = useCurrency();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const addonsKey = addonSlugs.join(",");

  useEffect(() => {
    if (!packageSlug) return;
    let cancelled = false;
    const params = new URLSearchParams({ package: packageSlug, currency });
    if (addonsKey) params.set("addons", addonsKey);
    fetch(`/api/commerce/pricing?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setPricing(d.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [packageSlug, addonsKey, currency]);

  if (!packageSlug || !pricing) return null;

  const extraCount = addonSlugs.length;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur px-4 py-2.5"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px))" }}
      role="status"
      aria-label="Order summary"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-slate-500 min-w-0">
          <Receipt className="h-4 w-4 shrink-0 text-[#0B8A83]" aria-hidden />
          <span className="truncate">
            {packageName ?? "Your package"}
            {extraCount > 0 && ` · ${extraCount} extra${extraCount === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="shrink-0 font-semibold text-[#0F172A]">
          {pricing.totalGhs === 0 ? "Free" : format(pricing.totalGhs)}
          <span className="ml-2 text-[11px] font-normal text-slate-400">no surprise charges</span>
        </span>
      </div>
    </div>
  );
}
