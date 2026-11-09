"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { useLocale } from "@/components/i18n/locale-provider";

type FooterLink = { label: string; href: string };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { t } = useLocale();

  const product: FooterLink[] = [
    { label: t("header.services"), href: "/#services" },
    { label: t("header.invitations"), href: "/invitations/catalogue" },
    { label: t("landing.pill_tickets"), href: "/discover" },
    { label: t("header.marketplace"), href: "/marketplace" },
    { label: t("landing.pill_cards"), href: "/digital-cards" },
    { label: t("header.pricing"), href: "/#pricing" },
  ];

  const solutions: FooterLink[] = [
    { label: t("footer.wedding_invitations"), href: "/invitations/catalogue?eventType=WEDDING" },
    { label: t("footer.funeral_os"), href: "/discover" },
    { label: t("footer.discover_events"), href: "/discover" },
  ];

  const company: FooterLink[] = [
    { label: t("footer.about"), href: "/legal/about" },
    { label: t("footer.contact"), href: "/legal/contact" },
    { label: t("footer.faq"), href: "/legal/faq" },
  ];

  const legal: FooterLink[] = [
    { label: t("footer.legal_center"), href: "/legal" },
    { label: t("footer.terms"), href: "/legal/terms" },
    { label: t("footer.privacy"), href: "/legal/privacy" },
    { label: t("footer.refund"), href: "/legal/refund" },
    { label: t("footer.cookie_policy"), href: "/legal/cookie" },
    { label: t("footer.revision_policy"), href: "/legal/revision-policy" },
    { label: t("footer.ip_policy"), href: "/legal/intellectual-property" },
    { label: t("footer.data_rights"), href: "/legal/data-rights" },
  ];

  return (
    <footer className="relative bg-slate-950 text-slate-400 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="max-w-sm shrink-0">
            <Logo variant="light" size="md" />
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 sm:gap-x-10 lg:flex-1 lg:max-w-3xl">
            <div className="row-span-2 sm:row-span-1">
              <FooterColumn title={t("footer.product")} links={product} />
            </div>
            <FooterColumn title={t("footer.solutions")} links={solutions} />
            <FooterColumn title={t("footer.company")} links={company} />
          </div>
        </div>

        <nav
          aria-label={t("footer.legal")}
          className="mt-10 pt-6 border-t border-slate-800/60"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
            {t("footer.legal")}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 pt-6 border-t border-slate-800/60 text-sm text-white text-center">
          © {new Date().getFullYear()} Celeventic. {t("footer.rights")}
        </p>
        <p className="mt-4 flex justify-center">
          <span className="inline-flex items-center rounded-full bg-brand-500/25 px-3 py-1 text-xs font-bold tracking-wide text-brand-200 ring-1 ring-brand-300/60 shadow-[0_0_20px_rgba(11,138,131,0.35)]">
            {t("footer.powered_by")}
          </span>
        </p>
      </div>
    </footer>
  );
}
