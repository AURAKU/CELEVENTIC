import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission, isPlatformAdmin, Permission } from "@/lib/rbac";
import { CeleYouAdminServicesDesk } from "@/components/digital-business-card/celeyou-admin-services-desk";

export const metadata = {
  title: "CeleYou services · Celeventic",
  description: "Admin management of CeleYou identity, billing, NFC, and share services.",
};

export default async function CeleYouAdminServicesPage() {
  const session = await getSession();
  if (!session?.user?.role || !isPlatformAdmin(session.user.role)) {
    redirect("/dashboard/business-card");
  }
  const canEditPrices = hasPermission({ role: session.user.role }, Permission.CELECARD_PRICING_MANAGE);
  return (
    <div className="mx-auto max-w-6xl py-5 sm:py-8">
      <CeleYouAdminServicesDesk canEditPrices={canEditPrices} />
    </div>
  );
}
