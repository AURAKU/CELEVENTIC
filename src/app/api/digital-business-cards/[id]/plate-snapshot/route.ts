import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sniffImageFormat } from "@/lib/media/image-processor";
import { celeCardLivePlateSnapshotKey } from "@/lib/digital-business-card/live-plate";
import { getDigitalCardForUser } from "@/services/digital-business-card/digital-business-card.service";
import { storeUploadFileAtRelativePath } from "@/lib/uploads/file-storage";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = celeCardLivePlateSnapshotKey(card.id);
  if (!key) return NextResponse.json({ error: "Invalid card" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 64) {
    return NextResponse.json({ error: "Capture the live plate first." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Plate image is too large." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = sniffImageFormat(buffer);
  if (format !== "png" && format !== "webp" && format !== "jpeg") {
    return NextResponse.json({ error: "Use a PNG of the live plate." }, { status: 400 });
  }

  const { url } = await storeUploadFileAtRelativePath(key, buffer);
  return NextResponse.json({ ok: true, data: { url } });
}
