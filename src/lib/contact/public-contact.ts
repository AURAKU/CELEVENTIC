import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LEGAL_CONTACT } from "@/lib/legal/constants";

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
    hours: (map["contact.hours"] as { value?: string })?.value ?? "Mon–Sat, 9am–6pm GMT",
  };
}

export const getPublicContactSettings = unstable_cache(
  loadContactSettings,
  ["public-contact-settings"],
  { revalidate: 120, tags: ["contact-settings"] }
);

export function formatContactPageContent(contact: PublicContactSettings, locale: "en" | "fr" = "en"): string {
  if (locale === "fr") {
    return `E-mail : ${contact.email}\nTéléphone : ${contact.phone}\nHoraires : ${contact.hours}`;
  }
  return `Email: ${contact.email}\nPhone: ${contact.phone}\nHours: ${contact.hours}`;
}
