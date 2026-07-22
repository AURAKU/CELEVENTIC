import { adminService } from "@/services/admin/admin.service";
import { AdminPackagesClient, type PackageRow } from "./admin-packages-client";

export default async function AdminPackagesPage() {
  const packages = await adminService.getPackages();
  const initial: PackageRow[] = packages.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price.toString(),
    currency: p.currency,
    guestLimit: p.guestLimit,
    invitationLimit: p.invitationLimit,
    ticketLimit: p.ticketLimit,
    smsCredits: p.smsCredits,
    whatsappCredits: p.whatsappCredits,
    emailCredits: p.emailCredits,
    features: p.features,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    packageFeatures: p.packageFeatures,
    _count: p._count,
  }));

  return <AdminPackagesClient initial={initial} />;
}
