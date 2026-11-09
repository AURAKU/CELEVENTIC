"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useCurrency } from "@/components/commerce/currency-provider";
import {
  formatInvitationPriceGhs,
  invitationPackageContactMessage,
  INVITATION_PACKAGE_ADDITIONAL_CHARGES,
  type InvitationPackageDef,
} from "@/lib/invitation-mvp/packages";
import { GUIDE_SUPPORT_CONTACT, guideSupportWhatsAppUrl } from "@/lib/celeventic-guide/support-contact";

const TIER_ORDER = ["starter", "celebration", "signature", "bespoke"] as const;

const HIGHLIGHTS: Record<string, string[]> = {
  starter: ["Custom invitation and RSVP", "Shareable guest link", "Up to 75 guests"],
  celebration: ["Premium templates", "Music, gallery, and QR access", "Up to 150 guests"],
  signature: ["Interactive reveal experience", "Memory Vault and thank-you page", "Up to 300 guests"],
  bespoke: ["Designer-assisted setup", "Event-day admission team", "Quoted from GHS 2,950"],
};

const COMPARE_ROWS: { label: string; from: string }[] = [
  { label: "Custom digital invitation", from: "starter" },
  { label: "RSVP and guest list", from: "starter" },
  { label: "Shareable invitation link", from: "starter" },
  { label: "Premium templates", from: "celebration" },
  { label: "Music, gallery, and QR access", from: "celebration" },
  { label: "Interactive experience", from: "signature" },
  { label: "Memory Vault and thank-you page", from: "signature" },
  { label: "Designer-assisted setup", from: "bespoke" },
  { label: "Event-day admission team", from: "bespoke" },
];

function packageHref(pkg: InvitationPackageDef) {
  if (pkg.quoteOnly) return guideSupportWhatsAppUrl(invitationPackageContactMessage(pkg));
  return `/invitations/catalogue?package=${pkg.slug}`;
}

function includedFrom(from: string, slug: string) {
  return TIER_ORDER.indexOf(slug as (typeof TIER_ORDER)[number]) >= TIER_ORDER.indexOf(from as (typeof TIER_ORDER)[number]);
}

function CompactPackageCard({ pkg }: { pkg: InvitationPackageDef }) {
  const { t } = useLocale();
  const popular = pkg.popular === true;
  const quote = pkg.quoteOnly === true;
  const href = packageHref(pkg);
  const highlights = HIGHLIGHTS[pkg.slug] ?? pkg.features.slice(0, 3);
  const stats = [
    pkg.guestCapacity ? `${pkg.guestCapacity} guests` : null,
    `${pkg.revisions} revision${pkg.revisions === 1 ? "" : "s"}`,
    `${pkg.deliveryDays} days`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 ${
        popular
          ? "border-[#0B8A83] shadow-[0_12px_36px_rgba(11,138,131,0.14)] ring-1 ring-[#0B8A83]/20"
          : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[#0F172A]">{pkg.name}</h3>
          <p className="mt-0.5 text-sm leading-snug text-slate-600">{pkg.description}</p>
        </div>
        {popular ? (
          <span className="shrink-0 rounded-full bg-[#0B8A83] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            {t("landing.pricing_popular")}
          </span>
        ) : quote ? (
          <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            Quote
          </span>
        ) : null}
      </div>

      <p className="mt-4 font-display text-[1.65rem] font-bold leading-none text-[#0F172A]">
        {formatInvitationPriceGhs(pkg)}
        <span className="ml-1 font-sans text-sm font-medium text-slate-500">{t("landing.pricing_per_event")}</span>
      </p>
      <p className="mt-2 text-[12px] font-medium text-slate-600">{stats}</p>
      {pkg.includesLabel ? (
        <p className="mt-2 text-[11px] font-semibold text-[#0B8A83]">{pkg.includesLabel}</p>
      ) : null}

      <ul className="mt-4 flex-1 space-y-1.5">
        {highlights.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-slate-800">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B8A83]" aria-hidden />
            <span className="leading-snug">{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Link
          href={href}
          target={quote ? "_blank" : undefined}
          rel={quote ? "noreferrer" : undefined}
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
            popular
              ? "bg-[#0B8A83] text-white hover:bg-[#097068]"
              : quote
                ? "bg-[#0F172A] text-white hover:bg-black"
                : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {pkg.ctaLabel ?? `${t("common.choose")} ${pkg.name}`}
        </Link>
        <p className="mt-2 text-center text-[11px] leading-snug text-slate-500">
          {quote ? `Or email ${GUIDE_SUPPORT_CONTACT.email}` : "Pay once, then build in Studio."}
        </p>
      </div>
    </article>
  );
}

export function PricingDisplay({ packages }: { packages: InvitationPackageDef[] }) {
  const { t } = useLocale();
  const { currency } = useCurrency();
  const flyer = TIER_ORDER.map((slug) => packages.find((pkg) => pkg.slug === slug)).filter(
    (pkg): pkg is InvitationPackageDef => Boolean(pkg)
  );
  const customisation = packages.find((pkg) => pkg.slug === "customisation");

  return (
    <section id="pricing" className="relative bg-mesh py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="badge-pill mb-4 border border-gold-200 bg-gold-100 text-gold-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("landing.pricing_flyer_pill")}
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.pricing_flyer_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {t("landing.pricing_flyer_lead")}
          </p>
          {currency !== "GHS" && (
            <p className="mt-2 text-xs text-slate-500">{t("commerce.display_currency_note", { currency })}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {flyer.map((pkg) => (
            <CompactPackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <p className="font-display text-base font-semibold text-slate-900">What each package includes</p>
              <p className="text-xs text-slate-500">Higher tiers keep everything in the ones before them.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <caption className="sr-only">Invitation package comparison</caption>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-5">
                    Included
                  </th>
                  {flyer.map((pkg) => (
                    <th
                      key={pkg.slug}
                      scope="col"
                      className={`px-3 py-2.5 text-center text-xs font-semibold ${
                        pkg.popular ? "bg-[#0B8A83]/10 text-[#0B8A83]" : "text-slate-700"
                      }`}
                    >
                      {pkg.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-medium text-slate-800 sm:px-5">
                      {row.label}
                    </th>
                    {flyer.map((pkg) => {
                      const yes = includedFrom(row.from, pkg.slug);
                      return (
                        <td
                          key={pkg.slug}
                          className={`px-3 py-2.5 text-center ${pkg.popular ? "bg-[#0B8A83]/5" : ""}`}
                        >
                          {yes ? (
                            <Check className="mx-auto h-4 w-4 text-[#0B8A83]" aria-label="Included" />
                          ) : (
                            <span className="sr-only">Not included</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {customisation ? (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#D4A63A]/40 bg-[linear-gradient(135deg,#0F172A_0%,#0B8A83_70%)] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F7EFD8]">
                {t("landing.pricing_customisation_kicker")}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{customisation.name}</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/90">{customisation.description}</p>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="font-display text-2xl font-bold">
                {formatInvitationPriceGhs(customisation)}
                <span className="ml-1 font-sans text-sm font-medium text-white/70">{t("landing.pricing_per_event")}</span>
              </p>
              <Link
                href={`/invitations/catalogue?package=${customisation.slug}`}
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#0F172A] hover:bg-[#F7EFD8]"
              >
                {customisation.ctaLabel ?? "Work with our team"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-slate-500">
          {INVITATION_PACKAGE_ADDITIONAL_CHARGES}
        </p>

        <div className="mt-5 flex flex-col items-center justify-center gap-1 text-sm sm:flex-row sm:gap-3">
          <p className="text-slate-600">{t("landing.pricing_taste_lead")}</p>
          <Link
            href="/auth/register?intent=host"
            className="inline-flex items-center gap-1 font-semibold text-[#0B8A83] hover:underline"
          >
            {t("landing.pricing_taste_cta")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
