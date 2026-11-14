import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LEGAL_CONTACT } from "@/lib/legal/constants";
import type { AppLocale } from "@/lib/i18n/constants";

export interface PublicContactSettings {
  phone: string;
  email: string;
  hours: string;
}

async function loadContactSettings(): Promise<PublicContactSettings> {
  const keys = ["contact.phone", "contact.email", "contact.hours"];
  const settings = await prisma.adminSetting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return {
    phone: (map["contact.phone"] as { value?: string })?.value ?? LEGAL_CONTACT.phone,
    email: (map["contact.email"] as { value?: string })?.value ?? LEGAL_CONTACT.email,
    hours: (map["contact.hours"] as { value?: string })?.value ?? "Mon to Sat, 9am to 6pm GMT",
  };
}

export const getPublicContactSettings = unstable_cache(
  loadContactSettings,
  ["public-contact-settings"],
  { revalidate: 120, tags: ["contact-settings"] }
);

export function formatContactPageContent(
  contact: PublicContactSettings,
  locale: AppLocale = "en"
): string {
  if (locale === "fr") {
    return `E-mail : ${contact.email}\nTéléphone : ${contact.phone}\nHoraires : ${contact.hours}`;
  }
  if (locale === "zh") {
    return `邮箱：${contact.email}\n电话：${contact.phone}\n时间：${contact.hours}`;
  }
  return `Email: ${contact.email}\nPhone: ${contact.phone}\nHours: ${contact.hours}`;
}
