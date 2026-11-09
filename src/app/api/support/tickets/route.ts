import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { supportTicketService } from "@/services/support/support-ticket.service";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  subject: z.string().min(3).max(160),
  body: z.string().min(4).max(8000),
  category: z
    .enum(["ACCOUNT", "PAYMENTS", "TICKETS", "INVITATIONS", "ADMISSION", "TECHNICAL", "OTHER"])
    .optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await supportTicketService.listForUser(session.user.id, {
    page,
    limit,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimit(`support-create:${session.user.id}`, 10, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many support requests. Please wait." }, { status: 429 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const ticket = await supportTicketService.create(session.user.id, body);
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "support_ticket",
      entityId: ticket.id,
      details: { category: ticket.category },
    });
    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create support ticket" },
      { status: 400 }
    );
  }
}
