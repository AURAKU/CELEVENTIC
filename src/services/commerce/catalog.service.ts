import { prisma } from "@/lib/prisma";
import { seedCommerceEngine } from "@/services/commerce/commerce-seed.service";
import { INVITATION_PACKAGES, type InvitationPackageDef } from "@/lib/invitation-mvp/packages";
import { INVITATION_ADDONS } from "@/lib/invitation-mvp/addons";

export interface CommerceAddon {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  priceGhs: number;
  packageEligibility: string[] | null;
  deliveryImpactDays: number;
}

function fallbackPackages(eventType?: string): InvitationPackageDef[] {
  return INVITATION_PACKAGES.filter((pkg) =>
    packageMatchesEventType(pkg.eventTypes ?? null, eventType)
  );
}

function fallbackAddons(packageSlug?: string): CommerceAddon[] {
  return INVITATION_ADDONS.map((addon) => ({
    slug: addon.slug,
    name: addon.name,
    description: addon.description,
    category: "GENERAL",
    priceGhs: addon.priceGhs,
    packageEligibility: null,
    deliveryImpactDays: 0,
  })).filter((addon) => {
    if (!packageSlug) return true;
    return !addon.packageEligibility?.length || addon.packageEligibility.includes(packageSlug);
  });
}

async function ensureSeeded() {
  try {
    const count = await prisma.invitationProductPackage.count();
    if (count === 0) await seedCommerceEngine();
  } catch (error) {
    console.warn("[catalog] seed skipped", error);
  }
}

function asEventTypes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.filter((v): v is string => typeof v === "string");
}

function packageMatchesEventType(eventTypes: string[] | null, eventType?: string): boolean {
  if (!eventType) return true;
  if (!eventTypes || eventTypes.length === 0) return true;
  const normalized = eventType.toUpperCase();
  return eventTypes.some((t) => t.toUpperCase() === normalized);
}

function mapPackage(pkg: {
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  priceGhs: unknown;
  revisions: number;
  deliveryDays: number;
  features: unknown;
  designerAssist: boolean;
  eventTypes?: unknown;
  prices?: { amountGhs: unknown }[];
}): InvitationPackageDef {
  const activePrice = pkg.prices?.[0];
  const priceGhs = Number(activePrice?.amountGhs ?? pkg.priceGhs);
  const rawFeatures = Array.isArray(pkg.features)
    ? (pkg.features as unknown[]).filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    : [];
  const bundled = INVITATION_PACKAGES.find((item) => item.slug === pkg.slug);
  const features =
    rawFeatures.length > 0
      ? rawFeatures
      : bundled?.features ?? ["Digital invitation", "RSVP", "Guest list"];
  return {
    slug: pkg.slug,
    name: bundled?.name ?? pkg.name,
    description: bundled?.description ?? pkg.tagline ?? pkg.description ?? "",
    priceGhs: bundled?.priceGhs ?? priceGhs,
    revisions: bundled?.revisions ?? pkg.revisions,
    deliveryDays: bundled?.deliveryDays ?? pkg.deliveryDays,
    features,
    designerAssist: bundled?.designerAssist ?? pkg.designerAssist,
    eventTypes: asEventTypes(pkg.eventTypes),
  };
}

export class CatalogService {
  async getActivePackages(eventType?: string): Promise<InvitationPackageDef[]> {
    try {
      await ensureSeeded();
      const packages = await prisma.invitationProductPackage.findMany({
        where: { isActive: true },
        include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { sortOrder: "asc" },
      });
      const mapped = packages
        .map(mapPackage)
        .filter((pkg) => packageMatchesEventType(pkg.eventTypes ?? null, eventType));
      return mapped.length > 0 ? mapped : fallbackPackages(eventType);
    } catch (error) {
      console.warn("[catalog] using bundled invitation packages", error);
      return fallbackPackages(eventType);
    }
  }

  async getPackageBySlug(slug: string): Promise<InvitationPackageDef | null> {
    try {
      await ensureSeeded();
      const pkg = await prisma.invitationProductPackage.findUnique({
        where: { slug },
        include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (pkg?.isActive) return mapPackage(pkg);
    } catch (error) {
      console.warn("[catalog] package lookup falling back to bundled catalogue", error);
    }
    return INVITATION_PACKAGES.find((pkg) => pkg.slug === slug) ?? null;
  }

  async getActiveAddons(packageSlug?: string): Promise<CommerceAddon[]> {
    try {
      await ensureSeeded();
      const addons = await prisma.invitationAddon.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      const mapped = addons
        .filter((a) => {
          const eligibility = a.packageEligibility as string[] | null;
          if (!packageSlug || !eligibility?.length) return true;
          return eligibility.includes(packageSlug);
        })
        .map((a) => ({
          slug: a.slug,
          name: a.name,
          description: a.description,
          category: a.category,
          priceGhs: Number(a.priceGhs),
          packageEligibility: a.packageEligibility as string[] | null,
          deliveryImpactDays: a.deliveryImpactDays,
        }));
      return mapped.length > 0 ? mapped : fallbackAddons(packageSlug);
    } catch (error) {
      console.warn("[catalog] using bundled invitation add-ons", error);
      return fallbackAddons(packageSlug);
    }
  }
}

export const catalogService = new CatalogService();
