import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import { adminService } from "@/services/admin/admin.service";
import { isPlatformAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  EventOwnerDashboard,
  OrganizerDashboard,
  OrganizationDashboard,
  VendorDashboardHome,
} from "@/components/dashboard/role-dashboards";
import type { RecentEventSummary } from "@/components/dashboard/recent-events-list";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true, onboardingCompletedAt: true, role: true },
  });

  if (!user?.onboardingCompletedAt && user?.role !== "VENDOR") {
    redirect("/dashboard/getting-started");
  }

  const userId = session.user.id;
  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const accountType = user?.accountType ?? "ORGANIZER";
  const role = (user?.role ?? session.user.role) as UserRole;
  const admin = isPlatformAdmin(role);

  if (accountType === "VENDOR" || user?.role === "VENDOR") {
    return <VendorDashboardHome firstName={firstName} />;
  }

  const [stats, events] = await Promise.all([
    eventService.getDashboardStats(userId),
    loadRecentEvents(userId, admin),
  ]);

  const dashProps = {
    firstName,
    stats,
    events,
    userId,
    isAdmin: admin,
    canEditEvents: true,
  };

  switch (accountType) {
    case "EVENT_OWNER":
      return <EventOwnerDashboard {...dashProps} />;
    case "ORGANIZATION":
      return <OrganizationDashboard {...dashProps} />;
    case "ORGANIZER":
    default:
      return <OrganizerDashboard {...dashProps} />;
  }
}

async function loadRecentEvents(userId: string, admin: boolean): Promise<RecentEventSummary[]> {
  if (admin) {
    const result = await adminService.getEvents(1, 5);
    return result.events.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      status: e.status,
      organizerId: e.organizerId,
      _count: e._count,
    }));
  }

  const result = await eventService.getOrganizerEvents(userId, 1, 5);
  return result.items.map((e) => ({
    id: e.id,
    title: e.title,
    startDate: e.startDate,
    status: e.status,
    organizerId: e.organizerId,
    _count: e._count,
  }));
}
