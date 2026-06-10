import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/i18n/constants";
import {
  CURRENT_LEGAL_VERSION,
  LEGAL_POLICY_SLUGS,
  type LegalPolicySlug,
} from "@/lib/legal/constants";
import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-legal-content";
import type { ConsentType, Prisma } from "@prisma/client";

export class ComplianceService {
  async ensureLegalDocumentsSeeded() {
    for (const slug of LEGAL_POLICY_SLUGS) {
      const existing = await prisma.legalDocumentVersion.findUnique({
        where: { slug_version: { slug, version: CURRENT_LEGAL_VERSION } },
      });
      if (existing) continue;

      const doc = DEFAULT_LEGAL_DOCUMENTS[slug];
      await prisma.legalDocumentVersion.create({
        data: {
          slug,
          version: CURRENT_LEGAL_VERSION,
          titleEn: doc.titleEn,
          titleFr: doc.titleFr,
          descriptionEn: doc.descriptionEn,
          descriptionFr: doc.descriptionFr,
          contentEn: doc.contentEn,
          contentFr: doc.contentFr,
          isPublished: true,
          requiresReacceptance: false,
        },
      });
    }
  }

  async getPublishedDocument(slug: LegalPolicySlug, locale: AppLocale = "en") {
    await this.ensureLegalDocumentsSeeded();

    const doc = await prisma.legalDocumentVersion.findFirst({
      where: { slug, isPublished: true },
      orderBy: { effectiveDate: "desc" },
    });

    if (!doc) {
      const fallback = DEFAULT_LEGAL_DOCUMENTS[slug];
      return {
        slug,
        version: CURRENT_LEGAL_VERSION,
        title: locale === "fr" ? fallback.titleFr : fallback.titleEn,
        description: locale === "fr" ? fallback.descriptionFr : fallback.descriptionEn,
        content: locale === "fr" ? fallback.contentFr : fallback.contentEn,
        locale,
        requiresReacceptance: false,
      };
    }

    return {
      slug,
      version: doc.version,
      title: locale === "fr" ? doc.titleFr : doc.titleEn,
      description: locale === "fr" ? doc.descriptionFr : doc.descriptionEn,
      content: locale === "fr" ? doc.contentFr : doc.contentEn,
      locale,
      requiresReacceptance: doc.requiresReacceptance,
      effectiveDate: doc.effectiveDate.toISOString(),
    };
  }

  async getCurrentVersions() {
    await this.ensureLegalDocumentsSeeded();
    const docs = await prisma.legalDocumentVersion.findMany({
      where: { slug: { in: [...LEGAL_POLICY_SLUGS] }, isPublished: true },
      orderBy: { effectiveDate: "desc" },
    });

    const map: Record<string, { version: string; requiresReacceptance: boolean }> = {};
    for (const d of docs) {
      if (!map[d.slug]) {
        map[d.slug] = { version: d.version, requiresReacceptance: d.requiresReacceptance };
      }
    }
    return map;
  }

  async getComplianceStatus(userId: string) {
    const [user, versions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          acceptedTermsVersion: true,
          acceptedPrivacyVersion: true,
          cookieConsent: true,
          consentTimestamp: true,
        },
      }),
      this.getCurrentVersions(),
    ]);

    if (!user) return { needsTerms: true, needsPrivacy: true };

    const currentTerms = versions.terms?.version;
    const currentPrivacy = versions.privacy?.version;
    const needsTerms =
      !user.acceptedTermsVersion || user.acceptedTermsVersion !== currentTerms;
    const needsPrivacy =
      !user.acceptedPrivacyVersion || user.acceptedPrivacyVersion !== currentPrivacy;

    return {
      needsTerms,
      needsPrivacy,
      needsReacceptance: needsTerms || needsPrivacy,
      acceptedTermsVersion: user.acceptedTermsVersion,
      acceptedPrivacyVersion: user.acceptedPrivacyVersion,
      currentTermsVersion: currentTerms,
      currentPrivacyVersion: currentPrivacy,
      cookieConsent: user.cookieConsent,
      consentTimestamp: user.consentTimestamp?.toISOString() ?? null,
    };
  }

  async recordConsent(
    userId: string,
    type: ConsentType,
    data: { version?: string; value?: string; metadata?: Record<string, unknown> }
  ) {
    const now = new Date();
    const update: Record<string, unknown> = { consentTimestamp: now };

    if (type === "TERMS" && data.version) update.acceptedTermsVersion = data.version;
    if (type === "PRIVACY" && data.version) update.acceptedPrivacyVersion = data.version;
    if (type === "COOKIE" && data.value) update.cookieConsent = data.value;

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: update }),
      prisma.userConsentRecord.create({
        data: {
          userId,
          type,
          version: data.version,
          value: data.value,
          metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      }),
    ]);
  }

  async getConsentHistory(userId: string) {
    return prisma.userConsentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async exportUserData(userId: string) {
    const [user, orders, payments, events, consentHistory] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          acceptedTermsVersion: true,
          acceptedPrivacyVersion: true,
          cookieConsent: true,
          consentTimestamp: true,
          createdAt: true,
        },
      }),
      prisma.invitationOrder.findMany({
        where: { userId },
        select: {
          id: true,
          eventTitle: true,
          status: true,
          packageSlug: true,
          templateSlug: true,
          portfolioConsent: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId },
        select: {
          reference: true,
          status: true,
          amount: true,
          purpose: true,
          createdAt: true,
        },
      }),
      prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true, title: true, slug: true, createdAt: true },
      }),
      this.getConsentHistory(userId),
    ]);

    await this.recordConsent(userId, "DATA_EXPORT", { metadata: { exportedAt: new Date().toISOString() } });

    return {
      exportedAt: new Date().toISOString(),
      profile: user,
      invitationOrders: orders,
      payments,
      events,
      consentHistory,
    };
  }

  async requestDataDeletion(userId: string) {
    await this.recordConsent(userId, "DATA_DELETION", {
      metadata: { requestedAt: new Date().toISOString(), status: "PENDING_REVIEW" },
    });
    return { status: "PENDING_REVIEW", message: "Your deletion request has been recorded. Our team will contact you within 30 days." };
  }

  async listDocumentVersions(slug?: string) {
    await this.ensureLegalDocumentsSeeded();
    return prisma.legalDocumentVersion.findMany({
      where: slug ? { slug } : undefined,
      orderBy: [{ slug: "asc" }, { effectiveDate: "desc" }],
    });
  }

  async publishDocumentVersion(data: {
    slug: string;
    version: string;
    contentEn: string;
    contentFr: string;
    titleEn?: string;
    titleFr?: string;
    descriptionEn?: string;
    descriptionFr?: string;
    requiresReacceptance?: boolean;
    createdBy?: string;
  }) {
    const defaults = DEFAULT_LEGAL_DOCUMENTS[data.slug as LegalPolicySlug];
    return prisma.legalDocumentVersion.upsert({
      where: { slug_version: { slug: data.slug, version: data.version } },
      update: {
        contentEn: data.contentEn,
        contentFr: data.contentFr,
        titleEn: data.titleEn ?? defaults?.titleEn ?? data.slug,
        titleFr: data.titleFr ?? defaults?.titleFr ?? data.slug,
        descriptionEn: data.descriptionEn ?? defaults?.descriptionEn ?? "",
        descriptionFr: data.descriptionFr ?? defaults?.descriptionFr ?? "",
        requiresReacceptance: data.requiresReacceptance ?? false,
        isPublished: true,
        effectiveDate: new Date(),
        createdBy: data.createdBy,
      },
      create: {
        slug: data.slug,
        version: data.version,
        contentEn: data.contentEn,
        contentFr: data.contentFr,
        titleEn: data.titleEn ?? defaults?.titleEn ?? data.slug,
        titleFr: data.titleFr ?? defaults?.titleFr ?? data.slug,
        descriptionEn: data.descriptionEn ?? defaults?.descriptionEn ?? "",
        descriptionFr: data.descriptionFr ?? defaults?.descriptionFr ?? "",
        requiresReacceptance: data.requiresReacceptance ?? false,
        isPublished: true,
        createdBy: data.createdBy,
      },
    });
  }

  async getAcceptanceStats() {
    const [totalUsers, termsAccepted, privacyAccepted, cookieSet] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { acceptedTermsVersion: { not: null } } }),
      prisma.user.count({ where: { acceptedPrivacyVersion: { not: null } } }),
      prisma.user.count({ where: { cookieConsent: { not: null } } }),
    ]);
    return { totalUsers, termsAccepted, privacyAccepted, cookieSet };
  }
}

export const complianceService = new ComplianceService();
