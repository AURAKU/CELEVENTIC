"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { useLocale } from "@/components/i18n/locale-provider";

export function Footer() {
  const { t } = useLocale();

  const footerLinks = {
    [t("footer.product")]: [
      { label: t("header.features"), href: "#features" },
      { label: t("header.invitations"), href: "/invitations" },
      { label: t("header.templates"), href: "/templates" },
      { label: t("header.pricing"), href: "#pricing" },
    ],
    [t("footer.solutions")]: [
      { label: t("footer.wedding_invitations"), href: "/templates" },
      { label: t("footer.funeral_os"), href: "/discover" },
      { label: t("footer.discover_events"), href: "/discover" },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), href: "/legal/about" },
      { label: t("footer.contact"), href: "/legal/contact" },
      { label: t("footer.faq"), href: "/legal/faq" },
    ],
    [t("footer.legal")]: [
      { label: t("footer.legal_center"), href: "/legal" },
      { label: t("footer.terms"), href: "/legal/terms" },
      { label: t("footer.privacy"), href: "/legal/privacy" },
      { label: t("footer.refund"), href: "/legal/refund" },
      { label: t("footer.cookie_policy"), href: "/legal/cookie" },
      { label: t("footer.revision_policy"), href: "/legal/revision-policy" },
      { label: t("footer.ip_policy"), href: "/legal/intellectual-property" },
      { label: t("footer.data_rights"), href: "/legal/data-rights" },
    ],
  };

  return (
    <footer className="relative bg-slate-950 text-slate-400 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <Logo variant="light" showTagline size="lg" />
            <p className="mt-4 text-sm text-slate-500 max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm hover:text-brand-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-800/60 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Celeventic. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
