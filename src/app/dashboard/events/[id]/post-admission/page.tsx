import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyEventAccess } from "@/lib/event-access";
import { PostAdmissionStudioClient } from "@/components/admission/post-admission-studio-client";
import type { UserRole } from "@prisma/client";

export default async function PostAdmissionStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) notFound();

  const { id: eventId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = (dbUser?.role ?? session.user.role) as UserRole;

  try {
    await verifyEventAccess(eventId, session.user.id, role);
  } catch {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) notFound();

  return <PostAdmissionStudioClient eventId={event.id} />;
}
