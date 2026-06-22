"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { useLocale } from "@/components/i18n/locale-provider";

export function PageLoaderClient({ labelKey, className }: { labelKey?: string; className?: string }) {
  const { t } = useLocale();
  return <PageLoader label={labelKey ? t(labelKey) : t("common.loading")} className={className} />;
}
