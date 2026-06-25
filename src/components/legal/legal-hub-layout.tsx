"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LegalNav } from "@/components/legal/legal-nav";
import { useLocale } from "@/components/i18n/locale-provider";
import { LEGAL_POLICY_SLUGS_ORDERED, POLICY_DESC_KEYS, POLICY_TITLE_KEYS } from "@/lib/legal/policy-i18n";
import { LEGAL_CONTACT } from "@/lib/legal/constants";

export function LegalHubLayout() {
  const { t } = useLocale();
  const [contact, setContact] = useState(LEGAL_CONTACT);

  useEffect(() => {
    fetch("/api/public/contact")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setContact(d.data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> {t("legal.back_home")}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <LegalNav className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-sm" />
            </aside>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-sm shadow-[0_8px_40px_rgba(15,23,42,0.06)] p-8 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 mb-3">
                  {t("legal.legal_center")}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  {t("legal.hub_title")}
                </h1>
                <p className="mt-3 text-slate-600 leading-relaxed max-w-2xl">
                  {t("legal.hub_subtitle")}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {LEGAL_POLICY_SLUGS_ORDERED.map((slug) => (
                  <Link
                    key={slug}
                    href={`/legal/${slug}`}
                    className="group rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900 group-hover:text-brand-700">
                          {t(POLICY_TITLE_KEYS[slug])}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {t(POLICY_DESC_KEYS[slug])}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{t("legal.manage_data")}</p>
                    <p className="text-sm text-slate-600 mt-1">{t("legal.manage_data_desc")}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/privacy-center"
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shrink-0"
                >
                  {t("legal.privacy_center")}
                </Link>
              </div>

              <p className="text-sm text-slate-500 text-center">
                {t("legal.legal_questions")}:{" "}
                <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline">
                  {contact.email}
                </a>{" "}
                · {contact.phone}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
