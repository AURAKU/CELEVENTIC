"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { useSession } from "next-auth/react";

const CONSENT_KEY = "celeventic_cookie_consent";

export function CookieConsent() {
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      setVisible(false);
      setChecked(true);
      return;
    }

    if (status === "loading") return;

    if (session?.user) {
      fetch("/api/legal/consent")
        .then((r) => r.json())
        .then((d) => {
          const level = d.success ? d.data?.cookieConsent : null;
          if (level) {
            localStorage.setItem(CONSENT_KEY, level);
            setVisible(false);
          } else {
            setVisible(true);
          }
          setChecked(true);
        })
        .catch(() => {
          setVisible(true);
          setChecked(true);
        });
      return;
    }

    setVisible(true);
    setChecked(true);
  }, [session?.user, status]);

  async function accept(level: "essential" | "all") {
    localStorage.setItem(CONSENT_KEY, level);
    setVisible(false);

    if (session?.user) {
      await fetch("/api/legal/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "COOKIE", value: level }),
      }).catch(() => null);
    }
  }

  if (!checked || !visible) return null;

  return (
    <div role="dialog" aria-label={t("legal.cookie_title")} className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6 pointer-events-none">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_12px_48px_rgba(15,23,42,0.15)] p-5 sm:p-6 pointer-events-auto">
        <p className="text-sm font-semibold text-slate-900">{t("legal.cookie_title")}</p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {t("legal.cookie_body")}{" "}
          <Link href="/legal/cookie" className="text-brand-600 font-medium hover:underline">
            {t("legal.cookie_policy")}
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="text-brand-600 font-medium hover:underline">
            {t("legal.privacy_policy")}
          </Link>
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => accept("essential")}>
            {t("legal.cookie_essential")}
          </Button>
          <Button size="sm" onClick={() => accept("all")}>
            {t("legal.cookie_accept_all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
