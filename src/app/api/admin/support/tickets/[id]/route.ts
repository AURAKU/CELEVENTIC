import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { supportTicketService } from "@/services/support/support-ticket.service";
import { createAuditLog } from "@/lib/audit";
import type { SupportTicketStatus, UserRole } from "@prisma/client";

const patchSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  assignedToId: z.string().nullable().optional(),
  body: z.string().min(1).max(8000).optional(),
  isInternal: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const ticket = await supportTicketService.getForAdmin(id);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not found" },
      { status: 404 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = patchSchema.parse(await req.json());
    if (body.body) {
      await supportTicketService.reply({
        ticketId: id,
        authorId: session.user.id,
        body: body.body,
        isInternal: Boolean(body.isInternal),
        asAdmin: true,
      });
    }
    if (body.status || body.assignedToId !== undefined) {
      const current = await supportTicketService.getForAdmin(id);
      await supportTicketService.updateStatus(
        id,
        session.user.id,
        (body.status as SupportTicketStatus) ?? current.status,
        body.assignedToId
      );
    }
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "support_ticket",
      entityId: id,
      details: { status: body.status, assignedToId: body.assignedToId, internal: body.isInternal },
    });
    const ticket = await supportTicketService.getForAdmin(id);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}
