import { adminService } from "@/services/admin/admin.service";
import { getSession } from "@/lib/auth";
import { AdminUsersClient } from "./admin-users-client";
import type { UserRole } from "@prisma/client";

export default async function AdminUsersPage() {
  const session = await getSession();
  const { users } = await adminService.getUsers(1, 50);
  return (
    <AdminUsersClient
      actorRole={(session?.user?.role ?? "GUEST") as UserRole}
      initial={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
