import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatService } from "@/services/workspace/chat.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl } from "@/lib/pagination";
import type { UserRole } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; channelSlug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, channelSlug } = await params;
    await requireEventPermission(id, session.user.id, session.user.role as UserRole, EventPermissionKey.USE_TEAM_CHAT);

    const channel = await prisma.eventChatChannel.findFirst({
      where: { eventId: id, slug: channelSlug },
    });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const pagination = parsePaginationFromUrl(req.url);
    const result = await chatService.listMessages(channel.id, pagination);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}
