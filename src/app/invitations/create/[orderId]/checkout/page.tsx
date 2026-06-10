"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { CurrencySwitcher } from "@/components/commerce/currency-switcher";
import { useCurrency } from "@/components/commerce/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency } from "@/lib/utils";

export default function CheckoutPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { currency, format } = useCurrency();
  const { t } = useLocale();
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
      .then((d) => { if (d.success) setOrder(d.data); });
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const addons = (order.addonSlugs as string[] | null) ?? [];
    fetch(`/api/commerce/pricing?package=${order.packageSlug}&addons=${addons.join(",")}&currency=${currency}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPricing(d.data); });
  }, [order, currency]);

  async function handlePay() {
    if (!acceptTerms) {
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

    if (data.data.free) {
      window.location.href = `/invitations/create/${orderId}/success?url=${encodeURIComponent(data.data.shareUrl)}`;
      return;
    }

    if (data.data.authorizationUrl) {
      window.location.href = data.data.authorizationUrl;
    } else {
      setError(t("errors.paystack_not_configured"));
    }
  }

  if (!order || !pricing) return <PageLoader label={t("checkout.loading")} className="min-h-screen" />;

  const amountGhs = pricing.totalGhs;

  return (
    <MvpShell step={5} title={t("checkout.title")} subtitle={t("checkout.subtitle")}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex justify-center">
          <CurrencySwitcher />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-4">{error}</div>}
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-700">{t("checkout.order_summary")}</p>
            {pricing.lineItems.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="text-slate-500">{item.name}</span>
                <span className="font-medium">{format(item.amountGhs)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">{t("checkout.you_pay")}</span>
              <span className="font-bold text-[#0B8A83] text-lg">
                {amountGhs === 0 ? t("common.free") : format(amountGhs)}
              </span>
            </div>
            {currency !== "GHS" && amountGhs > 0 && (
              <p className="text-xs text-slate-400 text-center">
                {t("checkout.charged_detail", { amount: formatCurrency(amountGhs), rate: pricing.exchangeRate })}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t pt-5">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-slate-600">
                I agree to the{" "}
                <Link href="/legal/terms" target="_blank" className="text-[#0B8A83] font-medium hover:underline">Terms and Conditions</Link>
                ,{" "}
                <Link href="/legal/refund" target="_blank" className="text-[#0B8A83] font-medium hover:underline">Refund Policy</Link>
                , and{" "}
                <Link href="/legal/privacy" target="_blank" className="text-[#0B8A83] font-medium hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Portfolio (optional)</p>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="radio"
                name="portfolio"
                checked={portfolioConsent === true}
                onChange={() => setPortfolioConsent(true)}
                className="mt-0.5"
              />
              <span className="text-slate-600">Allow Celeventic to showcase this invitation in our portfolio and marketing.</span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="radio"
                name="portfolio"
                checked={portfolioConsent === false}
                onChange={() => setPortfolioConsent(false)}
                className="mt-0.5"
              />
              <span className="text-slate-600">Keep my invitation private.</span>
            </label>
          </div>

          <Button
            className="w-full mt-6 bg-[#0B8A83] hover:bg-[#097068]"
            size="lg"
            onClick={handlePay}
            disabled={loading || !acceptTerms}
          >
            {loading
              ? t("checkout.processing")
              : amountGhs === 0
                ? t("checkout.publish_free")
                : t("checkout.pay_now")}
          </Button>
          <p className="text-xs text-slate-400 text-center mt-4">{t("checkout.security_note")}</p>
        </div>
      </div>
    </MvpShell>
  );
}
