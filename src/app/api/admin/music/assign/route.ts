import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { musicLibraryService } from "@/services/music/music-library.service";

const assignSchema = z.object({
  trackId: z.string().min(1),
  templateIds: z.array(z.string()).optional(),
  eventIds: z.array(z.string()).optional(),
  clearTemplates: z.boolean().optional(),
  clearEvents: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await musicLibraryService.listAssignTargets();
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = assignSchema.parse(await req.json());
    const data = await musicLibraryService.assignTrack(body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assign failed" },
      { status: 400 }
    );
  }
}
