import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { storeUploadFile } from "@/lib/uploads/file-storage";

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const category = (form.get("category") as string) ?? "template";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storeUploadFile("templates", category, safeName, buffer);
    return NextResponse.json({ success: true, data: { url, type: file.type, size: file.size } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
