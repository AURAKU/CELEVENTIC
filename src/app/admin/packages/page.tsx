import { adminService } from "@/services/admin/admin.service";
import { AdminPackagesClient } from "./admin-packages-client";

export default async function AdminPackagesPage() {
  const packages = await adminService.getPackages();
  return (
    <AdminPackagesClient
      initial={packages.map((p) => ({
        ...p,
        price: p.price.toString(),
      }))}
    />
  );
}
