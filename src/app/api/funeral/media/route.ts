import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";
import { storeUploadFile } from "@/lib/uploads/file-storage";

const moderateSchema = z.object({
  action: z.literal("moderate"),
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  const pending = new URL(req.url).searchParams.get("pending") === "1";
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  if (pending) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyEventAccess(eventId, session.user.id, session.user.role);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const data = await funeralService.getMedia(eventId, pending);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (body.action === "moderate") {
      try {
        const data = moderateSchema.parse(body);
        const item = await funeralService.moderateMedia(data.id, data.status);
        return NextResponse.json({ success: true, data: item });
      } catch {
        return NextResponse.json({ error: "Moderation failed" }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const eventId = form.get("eventId") as string;
    const kind = (form.get("kind") as string) || "PHOTO";
    const caption = (form.get("caption") as string) || undefined;
    const author = (form.get("author") as string) || undefined;
    const file = form.get("file") as File | null;

    if (!eventId || !file) {
      return NextResponse.json({ error: "eventId and file required" }, { status: 400 });
    }

    await verifyEventAccess(eventId, session.user.id, session.user.role);

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storeUploadFile("memorial", eventId, safeName, buffer);

    const item = await funeralService.addMediaItem(eventId, {
      kind: kind as "PHOTO" | "VIDEO" | "AUDIO",
      url,
      caption,
      author,
      autoApprove: true,
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
