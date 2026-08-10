import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  createAdminGuide,
  listAdminGuides,
  seedCeleventicGuides,
} from "@/services/celeventic-guide/guide.service";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let guides = await listAdminGuides();
  if (guides.length === 0) {
    await seedCeleventicGuides();
    guides = await listAdminGuides();
  }
  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.action === "seed") {
    const result = await seedCeleventicGuides({ forceUpdate: !!body.forceUpdate });
    return NextResponse.json(result);
  }
  try {
    const guide = await createAdminGuide(body);
    return NextResponse.json({ guide }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
