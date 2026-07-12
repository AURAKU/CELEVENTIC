import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceInvitationService } from "@/services/workspace/invitation.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pagination = parsePaginationFromUrl(req.url);
  const result = await workspaceInvitationService.listForUser(session.user.id, pagination);
  return NextResponse.json({ success: true, data: result });
}
