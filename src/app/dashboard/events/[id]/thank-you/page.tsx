import { prisma } from "@/lib/prisma";
import { ThankYouEditor } from "@/components/dashboard/thank-you-editor";

export default async function DashboardEventThankYouPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true },
  });
  return <ThankYouEditor eventId={eventId} eventSlug={event?.slug ?? ""} />;
}
