import { AdminShell } from "@/components/layout/admin-shell";
import { getSession } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user || !canAccessAdminPanel(session.user.role)) {
    redirect("/dashboard?error=admin_forbidden");
  }

  const cookieStore = await cookies();
  if (cookieStore.get("admin_view_mode")?.value === "user") {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
