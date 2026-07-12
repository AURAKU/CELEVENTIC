import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceInvitationService } from "@/services/workspace/invitation.service";
import { z } from "zod";

const respondSchema = z.object({
  response: z.enum(["ACCEPTED", "DECLINED", "DEFERRED"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { token } = await params;
    const { response } = respondSchema.parse(await req.json());
    const result = await workspaceInvitationService.respond(token, session.user.id, response);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Response failed" },
      { status: 400 }
    );
  }
}
