"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { useLocale } from "@/components/i18n/locale-provider";
import type { CmsPageSlug } from "@/lib/cms-pages";
import { LegalContentRenderer } from "@/components/legal/legal-content-renderer";
import { LegalNav } from "@/components/legal/legal-nav";
import { formatDate } from "@/lib/utils";
import { LEGAL_POLICY_SLUGS } from "@/lib/legal/constants";

interface LegalPageLayoutProps {
  slug: CmsPageSlug;
  initialTitle: string;
  initialDescription: string;
  initialContent: string;
  initialVersion?: string;
  initialEffectiveDate?: string;
}

function isLegalPolicySlug(slug: string): slug is (typeof LEGAL_POLICY_SLUGS)[number] {
  return (LEGAL_POLICY_SLUGS as readonly string[]).includes(slug);
}

export function LegalPageLayout({
  slug,
  initialTitle,
  initialDescription,
  initialContent,
  initialVersion,
  initialEffectiveDate,
}: LegalPageLayoutProps) {
  const { locale, t } = useLocale();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [version, setVersion] = useState(initialVersion);
  const [effectiveDate, setEffectiveDate] = useState(initialEffectiveDate);

  useEffect(() => {
    fetch(`/api/cms/pages/${slug}?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTitle(d.data.title);
          setDescription(d.data.description);
          setContent(d.data.content);
          if (d.data.version) setVersion(d.data.version);
          if (d.data.effectiveDate) setEffectiveDate(d.data.effectiveDate);
        }
      });
  }, [slug, locale]);

  const showLegalNav = isLegalPolicySlug(slug);

  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href={showLegalNav ? "/legal" : "/"}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {showLegalNav ? t("legal.nav_center") : t("legal.back_home")}
          </Link>

          <div className={showLegalNav ? "grid gap-8 lg:grid-cols-[240px_1fr]" : ""}>
            {showLegalNav && (
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <LegalNav className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-sm" />
              </aside>
            )}

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-sm shadow-[0_8px_40px_rgba(15,23,42,0.06)] p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 mb-3">
                {t("legal.legal_center")}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{title}</h1>
              <p className="mt-3 text-slate-500">{description}</p>
              {(version || effectiveDate) && (
                <p className="mt-2 text-xs text-slate-400">
                  {version && (
                    <span>
                      {t("legal.version")} {version}
                    </span>
                  )}
                  {version && effectiveDate && <span> · </span>}
                  {effectiveDate && (
                    <span>
                      {t("legal.effective")} {formatDate(effectiveDate)}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-8">
                <LegalContentRenderer content={content} />
              </div>

              {showLegalNav && slug === "data-rights" && (
                <div className="mt-10 rounded-xl border border-brand-100 bg-brand-50/50 p-5">
                  <p className="font-semibold text-slate-900">{t("legal.data_rights_cta_title")}</p>
                  <p className="mt-1 text-sm text-slate-600">{t("legal.data_rights_cta_body")}</p>
                  <Link
                    href="/dashboard/privacy-center"
                    className="inline-block mt-3 text-sm font-medium text-brand-600 hover:underline"
                  >
                    {t("legal.data_rights_cta_link")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
