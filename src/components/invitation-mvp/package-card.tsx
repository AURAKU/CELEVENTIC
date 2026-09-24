"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  formatInvitationPriceGhs,
  invitationPackageContactMessage,
  type InvitationPackageDef,
} from "@/lib/invitation-mvp/packages";
import { GUIDE_SUPPORT_CONTACT, guideSupportWhatsAppUrl } from "@/lib/celeventic-guide/support-contact";

interface PackageCardProps {
  pkg: InvitationPackageDef;
  templateSlug: string;
  eventType: string;
  popular?: boolean;
}

export function PackageCard({ pkg, templateSlug, eventType, popular }: PackageCardProps) {
  const { t } = useLocale();
  const isPopular = popular ?? pkg.popular === true;
  const isQuote = pkg.quoteOnly === true;
  const checkoutHref = `/invitations/create/start?template=${templateSlug}&package=${pkg.slug}&eventType=${eventType}`;
  const contactHref = guideSupportWhatsAppUrl(invitationPackageContactMessage(pkg));
  const cta = pkg.ctaLabel ?? `${t("common.choose")} ${pkg.name}`;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-white p-6 ${
        isPopular
          ? "border-[#0B8A83] shadow-[0_12px_40px_rgba(11,138,131,0.18)] scale-[1.02]"
          : isQuote
            ? "border-[#D4A63A]/70 bg-[linear-gradient(180deg,#fffef8_0%,#ffffff_40%)]"
            : "border-slate-200/80"
      }`}
    >
      {isPopular ? (
        <Badge className="mb-3 bg-[#D4A63A] text-[#0F172A]">Most Popular</Badge>
      ) : isQuote ? (
        <Badge className="mb-3 bg-[#0F172A] text-[#F7EFD8]">Concierge</Badge>
      ) : null}
      <h3 className="font-display text-xl font-bold text-[#0F172A]">{pkg.name}</h3>
      <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>
      <div className="mt-4">
        <span className="font-display text-3xl font-bold text-[#0F172A]">
          {formatInvitationPriceGhs(pkg)}
        </span>
      </div>
      {pkg.includesLabel ? (
        <p className="text-xs font-medium text-[#0B8A83] mt-3">{pkg.includesLabel}</p>
      ) : null}
      <ul className="mt-5 space-y-2 flex-1">
        {(pkg.features?.length ? pkg.features : ["Digital invitation", "RSVP", "Guest list", "Share link"])
          .filter((f) => typeof f === "string" && f.trim().length > 0 && f !== pkg.includesLabel)
          .map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-[#0B8A83] shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
      </ul>
      <Button className="w-full mt-6 bg-[#0B8A83] hover:bg-[#097068]" asChild>
        <Link href={isQuote ? contactHref : checkoutHref} target={isQuote ? "_blank" : undefined} rel={isQuote ? "noreferrer" : undefined}>
          {cta}
        </Link>
      </Button>
      {isQuote ? (
        <a
          href={`mailto:${GUIDE_SUPPORT_CONTACT.email}?subject=${encodeURIComponent(`Quotation: ${pkg.name}`)}`}
          className="mt-2 text-center text-xs text-slate-500 hover:text-[#0B8A83]"
        >
          Or email {GUIDE_SUPPORT_CONTACT.email}
        </a>
      ) : null}
    </div>
  );
}
