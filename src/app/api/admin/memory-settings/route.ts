import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PLATFORM_KEY = "memory_platform_defaults";

const schema = z.object({
  defaultMaxPhotosPerGuest: z.number().int().min(1).max(100).optional(),
  defaultMaxVideosPerGuest: z.number().int().min(0).max(50).optional(),
  defaultMaxImageSizeMb: z.number().int().min(1).max(500).optional(),
  defaultMaxVideoSizeMb: z.number().int().min(1).max(2000).optional(),
  platformMaxUploadMb: z.number().int().min(1).max(5000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.adminSetting.findUnique({ where: { key: PLATFORM_KEY } });
  const defaults = {
    defaultMaxPhotosPerGuest: 10,
    defaultMaxVideosPerGuest: 2,
    defaultMaxImageSizeMb: 50,
    defaultMaxVideoSizeMb: 200,
    platformMaxUploadMb: 500,
    ...(row?.value && typeof row.value === "object" ? row.value : {}),
  };

  const flagged = await prisma.eventMemoryUpload.count({ where: { status: "PENDING" } });
  const totalStorage = await prisma.eventMemoryUpload.count();

  return NextResponse.json({ success: true, data: { defaults, flagged, totalStorage } });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await req.json());
  await prisma.adminSetting.upsert({
    where: { key: PLATFORM_KEY },
    create: { key: PLATFORM_KEY, value: data, category: "memory" },
    update: { value: data },
  });
  return NextResponse.json({ success: true, data });
}
