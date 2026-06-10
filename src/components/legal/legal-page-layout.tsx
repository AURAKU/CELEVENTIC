"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { useLocale } from "@/components/i18n/locale-provider";
import type { CmsPageSlug } from "@/lib/cms-pages";
import { LegalContentRenderer } from "@/components/legal/legal-content-renderer";

interface LegalPageLayoutProps {
  slug: CmsPageSlug;
  initialTitle: string;
  initialDescription: string;
  initialContent: string;
}

export function LegalPageLayout({
  slug,
  initialTitle,
  initialDescription,
  initialContent,
}: LegalPageLayoutProps) {
  const { locale, t } = useLocale();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    fetch(`/api/cms/pages/${slug}?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTitle(d.data.title);
          setDescription(d.data.description);
          setContent(d.data.content);
        }
      });
  }, [slug, locale]);

  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> {t("legal.back_home")}
          </Link>
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-sm shadow-[0_8px_40px_rgba(15,23,42,0.06)] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 mb-3">
              {t("legal.legal_center")}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="mt-3 text-slate-500">{description}</p>
            <div className="mt-8">
              <LegalContentRenderer content={content} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
