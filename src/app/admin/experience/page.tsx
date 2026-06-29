import { adminService } from "@/services/admin/admin.service";
import { AdminExperienceCommandCenter } from "./admin-experience-command-center";

export const metadata = {
  title: "Experience Engine | Admin",
};

export default async function AdminExperiencePage() {
  const stats = await adminService.getStats();

  return (
    <AdminExperienceCommandCenter
      stats={{
        totalUsers: stats.totalUsers,
        totalInvitations: stats.totalInvitations,
        totalRevenue: stats.totalRevenue,
        totalEvents: stats.totalEvents,
      }}
    />
  );
}
