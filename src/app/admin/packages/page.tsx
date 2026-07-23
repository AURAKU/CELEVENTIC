import { adminService } from "@/services/admin/admin.service";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { AdminPackagesClient, type PackageRow } from "./admin-packages-client";

export default async function AdminPackagesPage() {
  const result = await adminService.getPackages(1, ADMIN_TABLE_LIMIT);
  const initial: PackageRow[] = result.items.map((p) => ({
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

  return (
    <AdminPackagesClient
      initial={initial}
      initialTotal={result.total}
      initialPages={result.pages}
    />
  );
}
