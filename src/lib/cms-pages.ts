import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/i18n/constants";
import { translationService } from "@/services/i18n/translation.service";
import { complianceService } from "@/services/legal/compliance.service";
import { LEGAL_POLICY_SLUGS, type LegalPolicySlug } from "@/lib/legal/constants";
import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-legal-content";
import { formatContactPageContent, getPublicContactSettings } from "@/lib/contact/public-contact";

export type CmsPageSlug = LegalPolicySlug | "about" | "faq" | "contact";

const INFO_PAGE_DEFAULTS: Record<
  "about" | "faq" | "contact",
  { contentEn: string; contentFr: string }
> = {
  about: {
    contentEn:
      "Celeventic is a global Event Operating System — Celebrate • Event • Ticket. We help organizers create luxury digital invitations, manage guests, sell tickets, and preserve memories through InvitationOS, VendorOS, and Celeventic Intelligence.",
    contentFr:
      "Celeventic est un Event Operating System mondial — Célébrer • Événement • Billet. Nous aidons les organisateurs à créer des invitations numériques de luxe, gérer les invités, vendre des billets et préserver les souvenirs via InvitationOS, VendorOS et Celeventic Intelligence.",
  },
  faq: {
    contentEn:
      "## How do I create an invitation?\nSign up, choose a template and package, add your event details, and publish your unique guest link.\n\n## Can guests RSVP without an account?\nYes — RSVP works from the public invitation link.\n\n## Which payments are supported?\nPaystack in GHS with USD and GBP display references on packages.\n\n## Can I get designer help?\nSignature, Prestige, and Bespoke packages include designer-assisted production.",
    contentFr:
      "## Comment créer une invitation ?\nInscrivez-vous, choisissez un modèle et un forfait, ajoutez les détails de votre événement et publiez votre lien invité unique.\n\n## Les invités ont-ils besoin d'un compte ?\nNon — le RSVP fonctionne depuis le lien public d'invitation.\n\n## Quels paiements sont acceptés ?\nPaystack en GHS avec affichage USD et GBP sur les forfaits.\n\n## Puis-je obtenir l'aide d'un designer ?\nLes forfaits Signature, Prestige et Bespoke incluent une production assistée par designer.",
  },
  contact: {
    contentEn: "Email: Celeventic@gmail.com\nPhone: 020 961 2770\nHours: Mon–Sat, 9am–6pm GMT",
    contentFr: "E-mail : Celeventic@gmail.com\nTéléphone : 020 961 2770\nHoraires : lun.–sam., 9h–18h GMT",
  },
};

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
    defaultContent: INFO_PAGE_DEFAULTS.about.contentEn,
  },
  faq: {
    title: "Frequently Asked Questions",
    description: "Common questions about invitations, tickets, and payments.",
    defaultContent: INFO_PAGE_DEFAULTS.faq.contentEn,
  },
  contact: {
    title: "Contact Us",
    description: "Reach the Celeventic team.",
    defaultContent: INFO_PAGE_DEFAULTS.contact.contentEn,
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

  if (slug === "contact") {
    const contact = await getPublicContactSettings();
    return formatContactPageContent(contact, locale);
  }

  if (slug === "about" || slug === "faq") {
    return locale === "fr" ? INFO_PAGE_DEFAULTS[slug].contentFr : INFO_PAGE_DEFAULTS[slug].contentEn;
  }

  return CMS_PAGES[slug].defaultContent;
}

export const getCmsPage = unstable_cache(
  async (slug: CmsPageSlug, locale: AppLocale = "en") => {
    if (isLegalPolicySlug(slug)) {
      const doc = await complianceService.getPublishedDocument(slug, locale);
      return {
        slug,
        title: doc.title,
        description: doc.description,
        content: doc.content,
        locale,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
      };
    }

    const [title, description, content] = await Promise.all([
      translationService.tAsync(locale, "legal", `${slug}_title`),
      translationService.tAsync(locale, "legal", `${slug}_desc`),
      loadPageContent(slug, locale),
    ]);

    return { slug, title, description, content, locale };
  },
  ["cms-pages"],
  { revalidate: 120, tags: ["cms-pages"] }
);
