import { EventMemoriesDashboard } from "@/components/dashboard/event-memories-dashboard";

export default async function DashboardEventMemoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  return <EventMemoriesDashboard eventId={eventId} />;
}
