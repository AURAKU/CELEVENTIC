import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { collaboratorService } from "@/services/workspace/collaborator.service";
import { workspaceInvitationService } from "@/services/workspace/invitation.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const inviteSchema = z.object({
  inviteeUserId: z.string().optional(),
  inviteeEmail: z.string().email().optional(),
  inviteePhone: z.string().optional(),
  inviteeName: z.string().optional(),
  role: z.string(),
  permissions: z.array(z.string()).optional(),
  message: z.string().optional(),
  directAdd: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const pagination = parsePaginationFromUrl(req.url);
    const result = await collaboratorService.list(
      id,
      session.user.id,
      session.user.role as UserRole,
      pagination
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load collaborators" },
      { status: 400 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = inviteSchema.parse(await req.json());

    if (body.directAdd && body.inviteeUserId) {
      const collaborator = await collaboratorService.addDirect(
        id,
        session.user.id,
        session.user.role as UserRole,
        {
          userId: body.inviteeUserId,
          role: body.role as never,
          permissions: body.permissions,
        }
      );
      return NextResponse.json({ success: true, data: collaborator });
    }

    const invitation = await workspaceInvitationService.inviteToEvent(
      id,
      session.user.id,
      session.user.role as UserRole,
      {
        inviteeUserId: body.inviteeUserId,
        inviteeEmail: body.inviteeEmail,
        inviteePhone: body.inviteePhone,
        inviteeName: body.inviteeName,
        role: body.role as never,
        permissions: body.permissions,
        message: body.message,
      }
    );
    return NextResponse.json({ success: true, data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite collaborator" },
      { status: 400 }
    );
  }
}
