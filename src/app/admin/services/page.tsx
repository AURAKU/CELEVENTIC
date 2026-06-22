import { adminService } from "@/services/admin/admin.service";
import { AdminServicesClient } from "./admin-services-client";

export default async function AdminServicesPage() {
  const settings = await adminService.getSettings();
  return (
    <AdminServicesClient
      initial={settings.map((s) => ({
        id: s.id,
        key: s.key,
        value: s.value as Record<string, unknown>,
        category: s.category,
      }))}
    />
  );
}
