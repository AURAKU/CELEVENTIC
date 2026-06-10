import { adminService } from "@/services/admin/admin.service";
import { templateEngineService } from "@/services/template-engine/template-engine.service";
import { AdminTemplatesClient } from "./admin-templates-client";

export default async function AdminTemplatesPage() {
  const [legacyTemplates, designTemplates] = await Promise.all([
    adminService.getTemplates(),
    templateEngineService.adminList(),
  ]);

  return (
    <AdminTemplatesClient
      legacyTemplates={legacyTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        isActive: t.isActive,
        config: t.config as { primary?: string; secondary?: string },
      }))}
      designTemplates={designTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        style: t.style,
        productType: t.productType,
        isPremium: t.isPremium,
        price: t.price,
        isFeatured: t.isFeatured,
        isActive: t.isActive,
        approvalStatus: t.approvalStatus,
        popularity: t.popularity,
        purchases: t._count.purchases,
      }))}
    />
  );
}
