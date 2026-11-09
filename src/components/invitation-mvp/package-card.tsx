"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  formatInvitationPriceGhs,
  invitationPackageContactMessage,
  isCustomisationInvitationPackage,
  type InvitationPackageDef,
} from "@/lib/invitation-mvp/packages";
import { GUIDE_SUPPORT_CONTACT, guideSupportWhatsAppUrl } from "@/lib/celeventic-guide/support-contact";

interface PackageCardProps {
  pkg: InvitationPackageDef;
  templateSlug?: string;
  eventType?: string;
  popular?: boolean;
}

function packageHref(pkg: InvitationPackageDef, templateSlug?: string, eventType?: string) {
  if (pkg.quoteOnly) return guideSupportWhatsAppUrl(invitationPackageContactMessage(pkg));
  if (templateSlug) {
    const type = eventType ? `&eventType=${encodeURIComponent(eventType)}` : "";
    return `/invitations/create/start?template=${encodeURIComponent(templateSlug)}&package=${pkg.slug}${type}`;
  }
  return `/invitations/catalogue?package=${pkg.slug}`;
}

export function PackageCard({ pkg, templateSlug, eventType, popular }: PackageCardProps) {
  const { t } = useLocale();
  const isPopular = popular ?? pkg.popular === true;
  const isQuote = pkg.quoteOnly === true;
  const isCustom = isCustomisationInvitationPackage(pkg.slug);
  const href = packageHref(pkg, templateSlug, eventType);
  const cta = pkg.ctaLabel ?? `${t("common.choose")} ${pkg.name}`;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-white p-6 ${
        isPopular
          ? "border-[#E11D48]/40 shadow-[0_12px_40px_rgba(225,29,72,0.14)] scale-[1.02] bg-[linear-gradient(180deg,#fff5f7_0%,#ffffff_38%)]"
          : isQuote
            ? "border-[#0F172A]/70 bg-[linear-gradient(180deg,#0F172A_0%,#0F172A_28%,#ffffff_28%)]"
            : isCustom
              ? "border-[#D4A63A]/70 bg-[linear-gradient(180deg,#fffef8_0%,#ffffff_40%)]"
              : "border-slate-200/80"
      }`}
    >
      {isPopular ? (
        <Badge className="mb-3 bg-[#E11D48] text-white hover:bg-[#E11D48]">Most Popular</Badge>
      ) : isQuote ? (
        <Badge className="mb-3 bg-[#D4A63A] text-[#0F172A] hover:bg-[#D4A63A]">Concierge</Badge>
      ) : isCustom ? (
        <Badge className="mb-3 bg-[#0F172A] text-[#F7EFD8] hover:bg-[#0F172A]">Team-built</Badge>
      ) : null}
      <h3 className={`font-display text-xl font-bold ${isQuote ? "text-white" : "text-[#0F172A]"}`}>
        {pkg.name}
      </h3>
      <p className={`text-sm mt-1 leading-relaxed ${isQuote ? "text-white/95" : "text-slate-600"}`}>{pkg.description}</p>
      <div className="mt-4">
        <span className={`font-display text-3xl font-bold ${isQuote ? "text-white" : "text-[#0F172A]"}`}>
          {formatInvitationPriceGhs(pkg)}
        </span>
      </div>
      {pkg.includesLabel ? (
        <p className={`text-xs font-medium mt-3 ${isQuote ? "text-[#D4A63A]" : "text-[#0B8A83]"}`}>
          {pkg.includesLabel}
        </p>
      ) : null}
      <ul className={`mt-5 space-y-2 flex-1 ${isQuote ? "pt-2" : ""}`}>
        {(pkg.features?.length ? pkg.features : ["Digital invitation", "RSVP", "Guest list", "Share link"])
          .filter((f) => typeof f === "string" && f.trim().length > 0 && f !== pkg.includesLabel)
          .map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-[#0B8A83] shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
      </ul>
      <Button
        className={`w-full mt-6 ${
          isPopular
            ? "bg-[#E11D48] hover:bg-[#be123c]"
            : isQuote
              ? "bg-[#0F172A] hover:bg-black"
              : "bg-[#0B8A83] hover:bg-[#097068]"
        }`}
        asChild
      >
        <Link href={href} target={isQuote ? "_blank" : undefined} rel={isQuote ? "noreferrer" : undefined}>
          {cta}
        </Link>
      </Button>
      {isQuote ? (
        <a
          href={`mailto:${GUIDE_SUPPORT_CONTACT.email}?subject=${encodeURIComponent(`Quotation: ${pkg.name}`)}`}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-center text-sm text-slate-600 hover:text-[#0B8A83]"
        >
          Or email {GUIDE_SUPPORT_CONTACT.email}
        </a>
      ) : (
        <p className="mt-2 text-center text-sm text-slate-600">
          {isCustom
            ? "Pay, then chat with the Celeventic team in Messages."
            : "Pay to unlock Studio and build the event."}
        </p>
      )}
    </div>
  );
}
