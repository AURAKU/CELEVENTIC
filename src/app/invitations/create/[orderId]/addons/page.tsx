"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/commerce/currency-provider";
import { CurrencySwitcher } from "@/components/commerce/currency-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

interface AddonRow {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  priceGhs: string | number;
  packageEligibility: string[] | null;
}

export default function AddonsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { format } = useCurrency();
  const { t } = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [eventType, setEventType] = useState("WEDDING");
  const [guestCount, setGuestCount] = useState<number | undefined>();

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then(async (orderRes) => {
        if (!orderRes.success) return;
        if (Array.isArray(orderRes.data.addonSlugs)) setSelected(orderRes.data.addonSlugs);
        const pkg = orderRes.data.packageSlug as string;
        setEventType(orderRes.data.eventType ?? "WEDDING");
        setGuestCount(orderRes.data.guestCount ?? undefined);
        const addonRes = await fetch(`/api/commerce/addons?package=${encodeURIComponent(pkg)}`).then((r) => r.json());
        if (addonRes.success) setAddons(addonRes.data);

        fetch("/api/invitation-os/design-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: orderRes.data.eventType,
            guestCount: orderRes.data.guestCount,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.data.suggestedAddons) {
              setSuggested(d.data.suggestedAddons.map((a: { slug: string }) => a.slug));
            }
          });
      });
  }, [orderId]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      fetch("/api/invitation-os/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "ADDON_SELECT", orderId, addonSlug: slug }),
      }).catch(() => {});
      return next;
    });
  }

  async function handleContinue() {
    setSaving(true);
    await fetch(`/api/invitation-orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addonSlugs: selected }),
    });
    setSaving(false);
    router.push(`/invitations/create/${orderId}/blocks`);
  }

  return (
    <MvpShell step={2} title={t("forms.addons_title")} subtitle={t("forms.addons_subtitle")}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-center"><CurrencySwitcher /></div>
        {suggested.length > 0 && (
          <div className="rounded-2xl border border-[#D4A63A]/30 bg-[#D4A63A]/5 p-4">
            <p className="text-sm font-semibold text-[#0F172A]">Celeventic Smart Upsells</p>
            <p className="text-xs text-slate-500 mt-1">Recommended for your {eventType.toLowerCase().replace("_", " ")} with {guestCount ?? "your"} guests</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {suggested.map((slug) => {
                const addon = addons.find((a) => a.slug === slug);
                if (!addon) return null;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggle(slug)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selected.includes(slug) ? "bg-[#0B8A83] text-white border-[#0B8A83]" : "border-[#D4A63A] text-[#0F172A] hover:bg-[#D4A63A]/10"
                    }`}
                  >
                    + {addon.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {addons.length === 0 ? (
          <p className="text-center text-slate-500 py-8">{t("forms.loading_addons")}</p>
        ) : addons.map((addon) => (
          <button
            key={addon.slug}
            type="button"
            onClick={() => toggle(addon.slug)}
            className={`w-full text-left rounded-2xl border p-5 transition-all ${
              selected.includes(addon.slug)
                ? "border-[#0B8A83] bg-[#0B8A83]/5"
                : "border-slate-200/80 bg-white hover:border-[#0B8A83]/50"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-[#0F172A]">{addon.name}</p>
                <p className="text-sm text-slate-500 mt-1">{addon.description}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{addon.category}</p>
              </div>
              <p className="font-bold text-[#0B8A83]">{format(Number(addon.priceGhs))}</p>
            </div>
          </button>
        ))}
        <Button className="w-full bg-[#0B8A83] hover:bg-[#097068]" size="lg" onClick={handleContinue} disabled={saving}>
          {saving ? t("forms.saving") : t("forms.preview_invitation")}
        </Button>
      </div>
    </MvpShell>
  );
}
