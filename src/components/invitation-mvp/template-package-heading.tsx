"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function TemplatePackageHeading() {
  const { t } = useLocale();
  return (
    <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-6">
      {t("invitations.choose_package")}
    </h2>
  );
}
