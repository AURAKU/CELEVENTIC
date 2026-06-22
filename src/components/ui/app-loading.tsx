"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { useLocale } from "@/components/i18n/locale-provider";

export function AppLoading() {
  const { t } = useLocale();
  return <PageLoader label={t("common.loading_celeventic")} className="min-h-screen" />;
}

export function AuthLoading() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <PageLoader label={t("common.loading_sign_in")} />
    </div>
  );
}
