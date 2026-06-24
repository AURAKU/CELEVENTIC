"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

const LEGAL_ACCEPT_KEY = "celeventic_legal_accepted";

function cacheLegalAcceptance(termsVersion?: string, privacyVersion?: string) {
  if (typeof window === "undefined" || !termsVersion || !privacyVersion) return;
  localStorage.setItem(
    LEGAL_ACCEPT_KEY,
    JSON.stringify({ termsVersion, privacyVersion, at: new Date().toISOString() })
  );
}

function hasCachedLegalAcceptance(termsVersion?: string, privacyVersion?: string) {
  if (typeof window === "undefined" || !termsVersion || !privacyVersion) return false;
  try {
    const raw = localStorage.getItem(LEGAL_ACCEPT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { termsVersion?: string; privacyVersion?: string };
    return parsed.termsVersion === termsVersion && parsed.privacyVersion === privacyVersion;
  } catch {
    return false;
  }
}

export function TermsAcceptanceGate() {
  const { t } = useLocale();
  const [needsReacceptance, setNeedsReacceptance] = useState(false);
  const [versions, setVersions] = useState<{ terms?: string; privacy?: string }>({});
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/legal/status")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data.authenticated) return;

        const termsVer = d.data.currentTermsVersion as string | undefined;
        const privacyVer = d.data.currentPrivacyVersion as string | undefined;

        if (hasCachedLegalAcceptance(termsVer, privacyVer) && !d.data.needsReacceptance) {
          return;
        }

        if (d.data.needsReacceptance) {
          setNeedsReacceptance(true);
          setVersions({
            terms: termsVer ?? d.data.acceptedTermsVersion,
            privacy: privacyVer ?? d.data.acceptedPrivacyVersion,
          });
        } else if (termsVer && privacyVer) {
          cacheLegalAcceptance(termsVer, privacyVer);
        }
      })
      .catch(() => null);
  }, []);

  async function accept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch("/api/legal/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptTerms: true,
          acceptPrivacy: true,
          termsVersion: versions.terms,
          privacyVersion: versions.privacy,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setError(d.error ?? "Could not save your acceptance. Please try again.");
        return;
      }
      if (d.data.needsReacceptance) {
        setError("Acceptance was not recorded. Please try again.");
        return;
      }
      const termsVer = d.data.currentTermsVersion ?? versions.terms;
      const privacyVer = d.data.currentPrivacyVersion ?? versions.privacy;
      cacheLegalAcceptance(termsVer, privacyVer);
      setNeedsReacceptance(false);
      setVersions({});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
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
        {error && (
          <p className="mt-4 text-sm text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            {error}
          </p>
        )}
        <Button className="w-full mt-6" onClick={accept} disabled={accepting}>
          {accepting ? t("forms.saving") : t("legal.terms_gate_accept")}
        </Button>
      </div>
    </div>
  );
}
