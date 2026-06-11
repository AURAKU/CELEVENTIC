"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Cookie, Shield, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

interface ConsentRecord {
  id: string;
  type: string;
  version: string | null;
  value: string | null;
  createdAt: string;
}

interface PrivacyData {
  acceptedTermsVersion: string | null;
  acceptedPrivacyVersion: string | null;
  cookieConsent: string | null;
  consentTimestamp: string | null;
  history: ConsentRecord[];
}

export function PrivacyCenterClient() {
  const { t } = useLocale();
  const [data, setData] = useState<PrivacyData | null>(null);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/privacy-center");
    const d = await res.json();
    if (d.success) setData(d.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleExport() {
    setLoading("export");
    const res = await fetch("/api/privacy-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export" }),
    });
    const d = await res.json();
    if (d.success) {
      const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `celeventic-data-export-${Date.now()}.json`;
      a.click();
      setMessage(t("privacy.export_success"));
    }
    setLoading("");
    load();
  }

  async function handleDeletion() {
    if (!confirm(t("privacy.deletion_confirm"))) return;
    setLoading("deletion");
    const res = await fetch("/api/privacy-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deletion" }),
    });
    const d = await res.json();
    if (d.success) setMessage(t("privacy.deletion_requested"));
    setLoading("");
    load();
  }

  async function setCookie(level: "essential" | "all") {
    setLoading("cookie");
    await fetch("/api/privacy-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cookie", cookieValue: level }),
    });
    localStorage.setItem("celeventic_cookie_consent", level);
    setLoading("");
    load();
  }

  if (!data) return <p className="text-slate-500">{t("privacy.loading")}</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#0B8A83]" /> {t("privacy.title")}
        </h1>
        <p className="text-slate-500 mt-1">{t("privacy.subtitle")}</p>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{message}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">{t("privacy.terms_accepted")}</p>
            <p className="font-semibold">{data.acceptedTermsVersion ?? t("privacy.not_yet")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">{t("privacy.privacy_accepted")}</p>
            <p className="font-semibold">{data.acceptedPrivacyVersion ?? t("privacy.not_yet")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" /> {t("privacy.export_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">{t("privacy.export_desc")}</p>
          <Button onClick={handleExport} disabled={loading === "export"}>
            {loading === "export" ? t("privacy.preparing") : t("privacy.export_btn")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> {t("privacy.deletion_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">{t("privacy.deletion_desc")}</p>
          <Button variant="destructive" onClick={handleDeletion} disabled={loading === "deletion"}>
            {t("privacy.deletion_btn")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cookie className="h-4 w-4" /> {t("privacy.cookie_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            {t("privacy.cookie_current")} <Badge>{data.cookieConsent ?? t("privacy.not_yet")}</Badge>
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setCookie("essential")} disabled={loading === "cookie"}>
              {t("privacy.cookie_essential")}
            </Button>
            <Button size="sm" onClick={() => setCookie("all")} disabled={loading === "cookie"}>
              {t("privacy.cookie_all")}
            </Button>
          </div>
          <Link href="/legal/cookie" className="text-sm text-[#0B8A83] hover:underline">
            {t("privacy.read_cookie")}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t("privacy.history_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <p className="text-sm text-slate-500">{t("privacy.history_empty")}</p>
          ) : (
            <div className="space-y-2">
              {data.history.map((r) => (
                <div key={r.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <Badge variant="outline">{r.type}</Badge>
                    {r.version && <span className="ml-2 text-slate-500">v{r.version}</span>}
                    {r.value && <span className="ml-2 text-slate-500">{r.value}</span>}
                  </div>
                  <span className="text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/legal/privacy" className="text-[#0B8A83] hover:underline">
          {t("privacy.link_privacy")}
        </Link>
        <Link href="/legal/data-rights" className="text-[#0B8A83] hover:underline">
          {t("privacy.link_data_rights")}
        </Link>
        <Link href="/legal/terms" className="text-[#0B8A83] hover:underline">
          {t("privacy.link_terms")}
        </Link>
      </div>
    </div>
  );
}
