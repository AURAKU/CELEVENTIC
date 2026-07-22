"use client";

import { useCurrency } from "@/components/commerce/currency-provider";

interface LineItem {
  name: string;
  amountGhs: number;
}

interface OrderSummaryRailProps {
  packageName?: string;
  lineItems?: LineItem[];
  totalGhs?: number;
  revisions?: number;
  deliveryDays?: number;
  selectedAddonCount?: number;
  sticky?: boolean;
}

export function OrderSummaryRail({
  packageName,
  lineItems = [],
  totalGhs = 0,
  revisions,
  deliveryDays,
  selectedAddonCount = 0,
  sticky = true,
}: OrderSummaryRailProps) {
  const { format } = useCurrency();

  return (
    <aside
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${
        sticky ? "lg:sticky lg:top-24" : ""
      }`}
      aria-label="Order summary"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Order summary</p>
      {packageName && <p className="mt-2 font-display text-lg font-semibold text-[#0F172A]">{packageName}</p>}
      <div className="mt-4 space-y-2 text-sm">
        {lineItems.map((item) => (
          <div key={item.name} className="flex justify-between gap-3">
            <span className="text-slate-500">{item.name}</span>
            <span className="font-medium text-slate-800">{item.amountGhs === 0 ? "Included" : format(item.amountGhs)}</span>
          </div>
        ))}
        {lineItems.length === 0 && (
          <p className="text-slate-400">Pricing updates as you personalize.</p>
        )}
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
        <span className="font-semibold text-slate-700">Total</span>
        <span className="font-bold text-[#0B8A83]">{totalGhs === 0 ? "Free" : format(totalGhs)}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
        {typeof revisions === "number" && (
          <div>
            <dt>Revisions</dt>
            <dd className="font-medium text-slate-700">{revisions}</dd>
          </div>
        )}
        {typeof deliveryDays === "number" && (
          <div>
            <dt>Delivery</dt>
            <dd className="font-medium text-slate-700">{deliveryDays} day{deliveryDays === 1 ? "" : "s"}</dd>
          </div>
        )}
        <div>
          <dt>Extras</dt>
          <dd className="font-medium text-slate-700">{selectedAddonCount}</dd>
        </div>
      </dl>
      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Taxes and provider fees appear at secure checkout. No surprise charges after payment.
      </p>
    </aside>
  );
}
