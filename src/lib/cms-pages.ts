import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/i18n/constants";
import { translationService } from "@/services/i18n/translation.service";
import { complianceService } from "@/services/legal/compliance.service";
import { LEGAL_POLICY_SLUGS, type LegalPolicySlug } from "@/lib/legal/constants";
import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-legal-content";
import { formatContactPageContent, getPublicContactSettings } from "@/lib/contact/public-contact";
import { BRAND_MOTTO } from "@/lib/constants";
import { pickLocalized } from "@/lib/i18n/pick-localized";

export type CmsPageSlug = LegalPolicySlug | "about" | "faq" | "contact";

const INFO_PAGE_DEFAULTS: Record<
  "about" | "faq" | "contact",
  { contentEn: string; contentFr: string; contentZh: string }
> = {
  about: {
    contentEn:
      `Celeventic is a global Event Operating System: ${BRAND_MOTTO}. We help organizers create luxury digital invitations, manage guests, sell tickets, and preserve memories through InvitationOS, VendorOS, and Celeventic Intelligence.`,
    contentFr:
      `Celeventic est un Event Operating System mondial. Célébrations | Événements | Billets. Nous aidons les organisateurs à créer des invitations numériques de luxe, gérer les invités, vendre des billets et préserver les souvenirs via InvitationOS, VendorOS et Celeventic Intelligence.`,
    contentZh:
      `Celeventic 是全球活动操作系统：${BRAND_MOTTO}。我们帮助主办方制作高端数字请柬、管理宾客、销售门票，并通过 InvitationOS、VendorOS 和 Celeventic Intelligence 珍藏回忆。`,
  },
  faq: {
    contentEn:
      "## How do I create an invitation?\nSign up, choose a template and package, add your event details, and publish your unique guest link.\n\n## How much do invitation packages cost?\nStarter is GHS 450, Classic is GHS 800, Signature is GHS 1,500, and Ultimate Experience starts from GHS 2,950 with a custom quotation.\n\n## Can guests RSVP without an account?\nYes. RSVP works from the public invitation link.\n\n## Which payments are supported?\nPaystack in GHS for Starter, Classic, and Signature. Ultimate Experience is quoted separately.\n\n## Can I get designer help?\nSignature includes interactive production. Ultimate Experience adds full designer-assisted setup and event-day admission support.",
    contentFr:
      "## Comment créer une invitation ?\nInscrivez-vous, choisissez un modèle et un forfait, ajoutez les détails de votre événement et publiez votre lien invité unique.\n\n## Combien coûtent les forfaits d'invitation ?\nStarter : 450 GHS, Classic : 800 GHS, Signature : 1 500 GHS, et Ultimate Experience à partir de 2 950 GHS sur devis.\n\n## Les invités ont-ils besoin d'un compte ?\nNon. Le RSVP fonctionne depuis le lien public d'invitation.\n\n## Quels paiements sont acceptés ?\nPaystack en GHS pour Starter, Classic et Signature. Ultimate Experience est facturé sur devis.\n\n## Puis-je obtenir l'aide d'un designer ?\nSignature inclut une production interactive. Ultimate Experience ajoute une mise en place assistée par designer et le soutien d'admission le jour J.",
    contentZh:
      "## 如何创建请柬？\n注册，选择模板和套餐，填写活动详情，然后发布您的专属宾客链接。\n\n## 请柬套餐多少钱？\nStarter 为 450 GHS，Classic 为 800 GHS，Signature 为 1,500 GHS，Ultimate Experience 从 2,950 GHS 起，需单独报价。\n\n## 宾客需要账户才能回复出席吗？\n不需要。从公开请柬链接即可回复出席。\n\n## 支持哪些支付方式？\nStarter、Classic 和 Signature 通过 Paystack 以 GHS 结算。Ultimate Experience 单独报价。\n\n## 可以得到设计师协助吗？\nSignature 包含互动制作。Ultimate Experience 另加设计师协助布置和活动当天入场支持。",
  },
  contact: {
    contentEn: "Email: Celeventic@gmail.com\nPhone: 020 961 2770\nHours: Mon to Sat, 9am to 6pm GMT",
    contentFr: "E-mail : Celeventic@gmail.com\nTéléphone : 020 961 2770\nHoraires : lun. au sam., 9h à 18h GMT",
    contentZh: "邮箱：Celeventic@gmail.com\n电话：020 961 2770\n时间：周一至周六，格林尼治时间上午 9 点至下午 6 点",
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
    title: "FAQ & Guides",
    description: "Celeventic Guide tutorials, Start Here journeys, and common questions.",
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
    const d = INFO_PAGE_DEFAULTS[slug];
    return pickLocalized(locale, { en: d.contentEn, fr: d.contentFr, zh: d.contentZh }, d.contentEn);
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
