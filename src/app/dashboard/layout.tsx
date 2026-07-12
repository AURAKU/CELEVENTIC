import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true, onboardingCompletedAt: true },
  });

  if (!user?.accountType && !user?.onboardingCompletedAt && session.user.role !== "VENDOR") {
    redirect("/auth/onboarding/intent");
  }

  const cookieStore = await cookies();
  const adminViewMode = cookieStore.get("admin_view_mode");
  const isAdmin = isAdminRole(session.user.role as UserRole);

  const adminBanner =
    isAdmin && adminViewMode?.value === "user" ? (
      <div className="bg-gradient-to-r from-gold-500 to-gold-400 text-slate-900 text-center py-2.5 text-sm font-semibold shadow-md">
        Admin User View Mode —{" "}
        <form action="/api/admin/return-to-admin" method="POST" className="inline">
          <button type="submit" className="underline hover:no-underline cursor-pointer">
            Return to Admin Panel
          </button>
        </form>
      </div>
    ) : null;

  return <DashboardShell adminBanner={adminBanner}>{children}</DashboardShell>;
}
