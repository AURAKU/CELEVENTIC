"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/i18n/locale-provider";

function ResetPasswordForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || t("auth.reset_invalid"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("auth.could_not_save"));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-5">
        <p className="text-sm text-slate-600">{t("auth.reset_missing")}</p>
        <Link href="/auth/forgot-password" className="text-brand-600 text-sm font-semibold hover:underline">
          {t("auth.request_new_link")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-5">
        <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm text-brand-700">
          {t("auth.password_updated")}
        </div>
        <Link href="/auth/login" className="text-brand-600 text-sm font-semibold hover:underline">
          {t("auth.back_sign_in")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.new_password")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("auth.confirm_password")}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? t("auth.saving") : t("auth.save_password")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLocale();
  return (
    <AuthLayout title={t("auth.choose_password")} subtitle={t("auth.choose_password_body")}>
      <Suspense fallback={<p className="text-sm text-slate-500">{t("common.loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
