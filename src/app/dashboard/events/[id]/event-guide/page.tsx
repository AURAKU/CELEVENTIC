import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyEventAccess } from "@/lib/event-access";
import { EventGuideBuilder } from "@/components/event-guide/admin/event-guide-builder";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = {
  title: "Event Guide | Celeventic",
  description: "Build the guest-facing programme, seating finder and menu for your event.",
};

export default async function EventGuideAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = (dbUser?.role ?? session.user.role) as UserRole;

  let event;
  try {
    event = await verifyEventAccess(id, session.user.id, role);
  } catch {
    notFound();
  }

  return <EventGuideBuilder eventId={event.id} eventTitle={event.title} />;
}
