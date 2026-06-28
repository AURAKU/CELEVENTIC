import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { flyerService } from "@/services/flyer/flyer.service";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  action: z.enum(["publish", "duplicate"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const design = await flyerService.getById(id, session.user.id);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: design });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = updateSchema.parse(await req.json());
    if (body.action === "publish") {
      const design = await flyerService.publish(id, session.user.id);
      return NextResponse.json({ success: true, data: design });
    }
    if (body.action === "duplicate") {
      const design = await flyerService.duplicate(id, session.user.id);
      return NextResponse.json({ success: true, data: design }, { status: 201 });
    }
    const { action: _a, ...rest } = body;
    const design = await flyerService.update(id, session.user.id, rest);
    return NextResponse.json({ success: true, data: design });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await flyerService.delete(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
