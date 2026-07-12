import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatService } from "@/services/workspace/chat.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl } from "@/lib/pagination";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await requireEventPermission(id, session.user.id, session.user.role as UserRole, EventPermissionKey.USE_TEAM_CHAT);
    const channels = await chatService.listChannels(id);
    return NextResponse.json({ success: true, data: channels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}

const messageSchema = z.object({
  channelSlug: z.string(),
  body: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  voiceUrl: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await requireEventPermission(id, session.user.id, session.user.role as UserRole, EventPermissionKey.USE_TEAM_CHAT);
    const body = messageSchema.parse(await req.json());

    const channel = await prisma.eventChatChannel.findFirst({
      where: { eventId: id, slug: body.channelSlug },
    });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const message = await chatService.sendMessage({
      channelId: channel.id,
      senderId: session.user.id,
      body: body.body,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      voiceUrl: body.voiceUrl,
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}
