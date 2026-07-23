import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { messageService } from "@/services/messages/message.service";
import { parsePaginationFromUrl, DEFAULT_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread");
  if (threadId) {
    const { page, limit } = parsePaginationFromUrl(req.url, {
      limit: DEFAULT_LIMIT,
      maxLimit: 200,
    });
    const result = await messageService.getThread(session.user.id, threadId, page, limit);
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        items: result.items.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  }

  const inbox = await messageService.getInbox(session.user.id);
  return NextResponse.json({ success: true, data: inbox });
}

const postSchema = z.object({
  recipientId: z.string().optional(),
  leadId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  threadId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = postSchema.parse(await req.json());

    if (body.leadId) {
      const message = await messageService.replyToLead(
        session.user.id,
        body.leadId,
        body.body
      );
      return NextResponse.json({ success: true, data: message });
    }

    if (!body.recipientId) {
      return NextResponse.json({ error: "recipientId or leadId required" }, { status: 400 });
    }

    const message = await messageService.send({
      senderId: session.user.id,
      recipientId: body.recipientId,
      subject: body.subject,
      body: body.body,
      threadId: body.threadId,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 400 }
    );
  }
}
