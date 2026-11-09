import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFullPackageAccess } from "@/lib/access/package-access";
import { publicBillingSlugs } from "@/lib/packages/invitation-entitlements";
import { getCatalogInvitationPackages } from "@/lib/invitation-mvp/packages";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminFullAccess = hasFullPackageAccess(session.user.role);
  const allowed = new Set(publicBillingSlugs());

  const [org, packages, eventCount] = await Promise.all([
    prisma.organization.findFirst({
      where: { users: { some: { id: session.user.id } } },
      select: { plan: true, name: true },
    }),
    prisma.eventPackage.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, price: true, guestLimit: true, features: true },
    }),
    prisma.event.count({ where: { organizerId: session.user.id } }),
  ]);

  const visiblePackages = packages.filter((pkg) => allowed.has(pkg.slug));

  return NextResponse.json({
    success: true,
    data: {
      currentPlan: adminFullAccess ? "admin-full" : org?.plan ?? "starter",
      organizationName: org?.name ?? null,
      eventCount,
      packages: (visiblePackages.length > 0 ? visiblePackages : packages).map((pkg) => ({
        ...pkg,
        price: Number(pkg.price),
      })),
      invitationPackages: getCatalogInvitationPackages().map((pkg) => ({
        slug: pkg.slug,
        name: pkg.name,
        priceGhs: pkg.priceGhs,
        guestCapacity: pkg.guestCapacity ?? null,
        quoteOnly: pkg.quoteOnly === true,
        ctaLabel: pkg.ctaLabel ?? null,
      })),
      adminFullAccess,
    },
  });
}
