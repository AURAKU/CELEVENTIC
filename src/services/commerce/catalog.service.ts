import { prisma } from "@/lib/prisma";
import { seedCommerceEngine } from "@/services/commerce/commerce-seed.service";
import type { InvitationPackageDef } from "@/lib/invitation-mvp/packages";

export interface CommerceAddon {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  priceGhs: number;
  packageEligibility: string[] | null;
  deliveryImpactDays: number;
}

async function ensureSeeded() {
  const count = await prisma.invitationProductPackage.count();
  if (count === 0) await seedCommerceEngine();
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
  prices?: { amountGhs: unknown }[];
}): InvitationPackageDef {
  const activePrice = pkg.prices?.[0];
  const priceGhs = Number(activePrice?.amountGhs ?? pkg.priceGhs);
  const features = Array.isArray(pkg.features) ? (pkg.features as string[]) : [];
  return {
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.tagline ?? pkg.description ?? "",
    priceGhs,
    revisions: pkg.revisions,
    deliveryDays: pkg.deliveryDays,
    features,
    designerAssist: pkg.designerAssist,
  };
}

export class CatalogService {
  async getActivePackages(): Promise<InvitationPackageDef[]> {
    await ensureSeeded();
    const packages = await prisma.invitationProductPackage.findMany({
      where: { isActive: true },
      include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { sortOrder: "asc" },
    });
    return packages.map(mapPackage);
  }

  async getPackageBySlug(slug: string): Promise<InvitationPackageDef | null> {
    await ensureSeeded();
    const pkg = await prisma.invitationProductPackage.findUnique({
      where: { slug },
      include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return pkg?.isActive ? mapPackage(pkg) : null;
  }

  async getActiveAddons(packageSlug?: string): Promise<CommerceAddon[]> {
    await ensureSeeded();
    const addons = await prisma.invitationAddon.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return addons
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
  }
}

export const catalogService = new CatalogService();
