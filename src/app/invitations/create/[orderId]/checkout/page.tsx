"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { OrderSummaryRail } from "@/components/invitation-mvp/order-summary-rail";
import { useCurrency } from "@/components/commerce/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency } from "@/lib/utils";
import { hasFullPackageAccess } from "@/lib/access/package-access";

export default function CheckoutPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { data: session } = useSession();
  const { currency, format } = useCurrency();
  const { t } = useLocale();
  const adminBypass = hasFullPackageAccess(session?.user?.role);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [pricing, setPricing] = useState<{
    totalGhs: number;
    displayAmount: number;
    exchangeRate: number;
    lineItems: { name: string; amountGhs: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [portfolioConsent, setPortfolioConsent] = useState(false);

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data);
      });
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const addons = (order.addonSlugs as string[] | null) ?? [];
    fetch(
      `/api/commerce/pricing?package=${order.packageSlug}&addons=${addons.join(",")}&currency=${currency}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPricing(d.data);
      });
  }, [order, currency]);

  async function handlePay() {
    if (!acceptTerms && !adminBypass) {
      setError("Please accept the Terms and Conditions and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/invitation-orders/${orderId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayCurrency: currency,
        acceptTerms: true,
        portfolioConsent,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      setError(data.error || t("errors.payment_failed"));
      return;
    }

    if (data.data.free || data.data.unlockStudio) {
      window.location.href = `/invitations/create/${orderId}/studio`;
      return;
    }

    if (data.data.authorizationUrl) {
      window.location.href = data.data.authorizationUrl;
    } else {
      setError(t("errors.paystack_not_configured"));
    }
  }

  if (!order || !pricing) {
    return <PageLoader label={t("checkout.loading")} className="min-h-screen" />;
  }

  const amountGhs = adminBypass ? 0 : pricing.totalGhs;
  const pkg = order.package as { name?: string; revisions?: number; deliveryDays?: number } | null;

  return (
    <MvpShell step={4} title={t("checkout.title")} subtitle={t("checkout.subtitle")}>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {adminBypass && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Admin access — all packages unlocked free. No payment required.
            </div>
          )}
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-700">{t("checkout.order_summary")}</p>
            {pricing.lineItems.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="text-slate-500">{item.name}</span>
                <span className="font-medium">
                  {adminBypass ? t("common.free") : format(item.amountGhs)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">{t("checkout.you_pay")}</span>
              <span className="text-lg font-bold text-[#0B8A83]">
                {amountGhs === 0 ? t("common.free") : format(amountGhs)}
              </span>
            </div>
            {currency !== "GHS" && amountGhs > 0 && (
              <p className="text-center text-xs text-slate-400">
                {t("checkout.charged_detail", {
                  amount: formatCurrency(amountGhs),
                  rate: pricing.exchangeRate,
                })}
              </p>
            )}
          </div>

          {!adminBypass && (
            <div className="mt-6 space-y-3 border-t pt-5">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-slate-600">
                  I agree to the{" "}
                  <Link
                    href="/legal/terms"
                    target="_blank"
                    className="font-medium text-[#0B8A83] hover:underline"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/legal/privacy"
                    target="_blank"
                    className="font-medium text-[#0B8A83] hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={portfolioConsent}
                  onChange={(e) => setPortfolioConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-slate-600">
                  Allow Celeventic to feature anonymized design in our portfolio (optional)
                </span>
              </label>
            </div>
          )}

          <Button
            className="mt-6 w-full bg-[#0B8A83] hover:bg-[#097068]"
            size="lg"
            onClick={() => void handlePay()}
            disabled={loading || (!acceptTerms && !adminBypass)}
          >
            {loading
              ? t("checkout.processing")
              : adminBypass || amountGhs === 0
                ? "Unlock Studio & Continue"
                : t("checkout.pay_now")}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-400">
            {adminBypass
              ? "Admin unlock · Customize in Studio, then publish when ready."
              : "Secure payment · After payment you customize in Studio, then publish when ready."}
          </p>
        </div>

        <OrderSummaryRail
          packageName={pkg?.name ?? String(order.packageSlug ?? "")}
          lineItems={pricing.lineItems.map((item) =>
            adminBypass ? { ...item, amountGhs: 0 } : item
          )}
          totalGhs={amountGhs}
          revisions={pkg?.revisions}
          deliveryDays={pkg?.deliveryDays}
          selectedAddonCount={((order.addonSlugs as string[] | null) ?? []).length}
        />
      </div>
    </MvpShell>
  );
}
