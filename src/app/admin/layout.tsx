import { AdminShell } from "@/components/layout/admin-shell";
import { getSession, isAdminRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/dashboard");

  const cookieStore = await cookies();
  if (cookieStore.get("admin_view_mode")?.value === "user") {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
