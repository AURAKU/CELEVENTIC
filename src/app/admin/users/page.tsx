import { adminService } from "@/services/admin/admin.service";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const { users, total } = await adminService.getUsers(1, 50);
  return (
    <AdminUsersClient
      initial={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
