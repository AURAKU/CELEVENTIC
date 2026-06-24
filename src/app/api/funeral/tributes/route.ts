import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

const tributeSchema = z.object({
  eventId: z.string(),
  userName: z.string().min(1),
  message: z.string().min(1),
  mediaUrl: z.string().optional(),
});

const moderateSchema = z.object({
  action: z.literal("moderate"),
  tributeId: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  featured: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "moderate") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const data = moderateSchema.parse(body);
      const tribute = await getTributeMeta(data.tributeId);
      if (!tribute) return NextResponse.json({ error: "Tribute not found" }, { status: 404 });
      await verifyEventAccess(tribute.eventId, session.user.id, session.user.role);
      const updated = await funeralService.moderateTribute(data.tributeId, data.status, data.featured);
      return NextResponse.json({ success: true, data: updated });
    }

    const data = tributeSchema.parse(body);
    const session = await getServerSession(authOptions);
    let autoApprove = false;
    if (session?.user?.id) {
      try {
        await verifyEventAccess(data.eventId, session.user.id, session.user.role);
        autoApprove = true;
      } catch {
        autoApprove = session.user.role ? isAdminRole(session.user.role as UserRole) : false;
      }
    }
    const tribute = await funeralService.addTribute(data, autoApprove);
    return NextResponse.json({ success: true, data: tribute }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Tribute operation failed" }, { status: 500 });
  }
}

async function getTributeMeta(tributeId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.tributeMessage.findUnique({
    where: { id: tributeId },
    select: { eventId: true },
  });
}
