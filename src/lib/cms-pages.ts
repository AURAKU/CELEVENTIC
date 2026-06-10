import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

import type { AppLocale } from "@/lib/i18n/constants";

import { translationService } from "@/services/i18n/translation.service";

import { complianceService } from "@/services/legal/compliance.service";

import { LEGAL_POLICY_SLUGS, type LegalPolicySlug } from "@/lib/legal/constants";

import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-legal-content";



export type CmsPageSlug =

  | LegalPolicySlug

  | "about"

  | "faq"

  | "contact";



export const CMS_PAGES: Record<

  CmsPageSlug,

  { title: string; description: string; defaultContent: string }

> = {

  ...Object.fromEntries(

    LEGAL_POLICY_SLUGS.map((slug) => {

      const d = DEFAULT_LEGAL_DOCUMENTS[slug];

      return [slug, { title: d.titleEn, description: d.descriptionEn, defaultContent: d.contentEn }];

    })

  ) as Record<LegalPolicySlug, { title: string; description: string; defaultContent: string }>,

  about: {

    title: "About Celeventic",

    description: "The Intelligent Event Operating System.",

    defaultContent:

      "Celeventic is Ghana's premium EventOS — Celebrate • Event • Ticket. We help organizers create luxury digital invitations, manage guests, sell tickets, and preserve memories.",

  },

  faq: {

    title: "Frequently Asked Questions",

    description: "Common questions about invitations, tickets, and payments.",

    defaultContent:

      "How do I create an invitation? Sign up, choose a template and package, add your event details, and publish your unique guest link.\n\nCan guests RSVP without an account? Yes — RSVP works from the public invitation link.\n\nWhich payments are supported? Paystack in GHS with USD and GBP display references on packages.",

  },

  contact: {

    title: "Contact Us",

    description: "Reach the Celeventic team.",

    defaultContent: "Email: Celeventic@gmail.com\nPhone: 020 961 2770\nHours: Mon–Sat, 9am–6pm GMT",

  },

};



export function isCmsPageSlug(slug: string): slug is CmsPageSlug {

  return slug in CMS_PAGES;

}



function isLegalPolicySlug(slug: CmsPageSlug): slug is LegalPolicySlug {

  return (LEGAL_POLICY_SLUGS as readonly string[]).includes(slug);

}



async function loadPageContent(slug: CmsPageSlug, locale: AppLocale): Promise<string> {

  if (isLegalPolicySlug(slug)) {

    const doc = await complianceService.getPublishedDocument(slug, locale);

    if (doc.content?.trim()) return doc.content;

  }



  const localizedKey = `pages.${slug}.${locale}`;

  const localized = await prisma.adminSetting.findUnique({ where: { key: localizedKey } });

  const localizedVal = localized?.value as { content?: string } | null;

  if (localizedVal?.content?.trim()) return localizedVal.content;



  const legacy = await prisma.adminSetting.findUnique({ where: { key: `pages.${slug}` } });

  const legacyVal = legacy?.value as { content?: string } | null;

  if (legacyVal?.content?.trim()) return legacyVal.content;



  return CMS_PAGES[slug].defaultContent;

}



export const getCmsPage = unstable_cache(

  async (slug: CmsPageSlug, locale: AppLocale = "en") => {

    const meta = CMS_PAGES[slug];



    if (isLegalPolicySlug(slug)) {

      const doc = await complianceService.getPublishedDocument(slug, locale);

      return {

        slug,

        title: doc.title,

        description: doc.description,

        content: doc.content,

        locale,

        version: doc.version,

      };

    }



    const title = await translationService.tAsync(locale, "legal", `${slug}_title`);

    const description = meta.description;

    const content = await loadPageContent(slug, locale);

    return { slug, title, description, content, locale };

  },

  ["cms-pages"],

  { revalidate: 120, tags: ["cms-pages"] }

);


