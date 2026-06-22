"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

export function TermsAcceptanceGate() {
  const { t } = useLocale();
  const [needsReacceptance, setNeedsReacceptance] = useState(false);
  const [versions, setVersions] = useState<{ terms?: string; privacy?: string }>({});
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch("/api/legal/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.authenticated && d.data.needsReacceptance) {
          setNeedsReacceptance(true);
          setVersions({
            terms: d.data.currentTermsVersion,
            privacy: d.data.currentPrivacyVersion,
          });
        }
      });
  }, []);

  async function accept() {
    setAccepting(true);
    await fetch("/api/legal/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acceptTerms: true,
        acceptPrivacy: true,
        version: versions.terms,
      }),
    });
    setNeedsReacceptance(false);
    setAccepting(false);
  }

  if (!needsReacceptance) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full rounded-2xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-[#0B8A83] mb-3">
          <Shield className="h-5 w-5" />
          <p className="font-semibold">{t("legal.terms_gate_title")}</p>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{t("legal.terms_gate_body")}</p>
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          <Link href="/legal/terms" className="text-[#0B8A83] font-medium hover:underline" target="_blank">
            {t("legal.terms_link")}
          </Link>
          <Link href="/legal/privacy" className="text-[#0B8A83] font-medium hover:underline" target="_blank">
            {t("legal.privacy_policy")}
          </Link>
        </div>
        <Button className="w-full mt-6" onClick={accept} disabled={accepting}>
          {accepting ? t("forms.saving") : t("legal.terms_gate_accept")}
        </Button>
      </div>
    </div>
  );
}
