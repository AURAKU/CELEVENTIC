import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/services/events/event.service";
import { redirect } from "next/navigation";
import {
  EventOwnerDashboard,
  OrganizerDashboard,
  OrganizationDashboard,
  VendorDashboardHome,
} from "@/components/dashboard/role-dashboards";

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

  if (accountType === "VENDOR" || user?.role === "VENDOR") {
    return <VendorDashboardHome firstName={firstName} />;
  }

  const [stats, eventsResult] = await Promise.all([
    eventService.getDashboardStats(userId),
    eventService.getOrganizerEvents(userId, 1, 5),
  ]);
  const events = eventsResult.items;

  switch (accountType) {
    case "EVENT_OWNER":
      return <EventOwnerDashboard firstName={firstName} stats={stats} events={events} />;
    case "ORGANIZATION":
      return <OrganizationDashboard firstName={firstName} stats={stats} events={events} />;
    case "ORGANIZER":
    default:
      return <OrganizerDashboard firstName={firstName} stats={stats} events={events} />;
  }
}
