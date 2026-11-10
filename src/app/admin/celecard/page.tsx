import { getSession } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { CeleYouAdminServicesDesk } from "@/components/digital-business-card/celeyou-admin-services-desk";

export default async function AdminCeleCardPage() {
  const session = await getSession();
  const canEditPrices = Boolean(
    session?.user?.role && hasPermission({ role: session.user.role }, Permission.CELECARD_PRICING_MANAGE)
  );
  return <CeleYouAdminServicesDesk canEditPrices={canEditPrices} />;
}
