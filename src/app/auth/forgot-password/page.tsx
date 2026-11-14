"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/i18n/locale-provider";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || t("auth.could_not_send"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("auth.could_not_send"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t("auth.reset_password")} subtitle={t("auth.reset_subtitle")}>
      {sent ? (
        <div className="text-center space-y-5">
          <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm text-brand-700">
            {t("auth.reset_sent")}
          </div>
          <Link href="/auth/login" className="text-brand-600 text-sm font-semibold hover:underline">
            {t("auth.back_sign_in")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? t("auth.sending") : t("auth.send_reset")}
          </Button>
          <p className="text-center text-sm">
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              {t("auth.back_sign_in")}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
