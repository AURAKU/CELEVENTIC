"use client";

import { useEffect, useState } from "react";
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { CheckoutMethodId } from "@/lib/payments/checkout-methods";
import { cn } from "@/lib/utils";

interface MethodRow {
  id: CheckoutMethodId;
  label: string;
  description: string;
  connected: boolean;
  requiresConnection: boolean;
}

const ICONS: Record<CheckoutMethodId, typeof CreditCard> = {
  card: CreditCard,
  mobile_money: Smartphone,
  bank_transfer: Banknote,
  alipay: Wallet,
  wechat_pay: Wallet,
};

export function PaymentMethodPicker({
  value,
  onChange,
  className,
}: {
  value: CheckoutMethodId | "";
  onChange: (next: CheckoutMethodId | "") => void;
  className?: string;
}) {
  const { t } = useLocale();
  const [methods, setMethods] = useState<MethodRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/methods")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.success || !Array.isArray(d.data?.methods)) return;
        setMethods(d.data.methods as MethodRow[]);
      })
      .catch(() => {
        /* Keep an empty picker when the catalog cannot load. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!methods.length) return null;

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-sm font-semibold text-slate-800">{t("payment.choose_method")}</legend>
      <p className="text-xs text-slate-500">{t("payment.choose_method_hint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {methods.map((method) => {
          const Icon = ICONS[method.id] ?? Wallet;
          const selected = value === method.id;
          return (
            <button
              key={method.id}
              type="button"
              disabled={!method.connected}
              onClick={() => onChange(method.id)}
              className={cn(
                "flex min-h-14 items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                selected
                  ? "border-[#0B8A83] bg-teal-50/80 shadow-[0_0_0_1px_rgba(11,138,131,0.25)]"
                  : "border-slate-200 bg-white hover:border-brand-300",
                !method.connected && "cursor-not-allowed opacity-55 hover:border-slate-200"
              )}
              aria-pressed={selected}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0B8A83]" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {t(`payment.method_${method.id}`)}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                  {method.connected
                    ? t(`payment.method_${method.id}_hint`)
                    : t("payment.method_connect")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
