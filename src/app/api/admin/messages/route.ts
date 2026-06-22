import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { messageService } from "@/services/messages/message.service";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  userId: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = schema.parse(await req.json());
    const message = await messageService.adminSendToUser(
      session.user.id,
      body.userId,
      body.subject,
      body.body
    );

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "admin_message",
      entityId: message.id,
      details: { recipientId: body.userId },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
