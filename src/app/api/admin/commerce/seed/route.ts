import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { seedCommerceEngine } from "@/services/commerce/commerce-seed.service";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await seedCommerceEngine();
  return NextResponse.json({ success: true, message: "Commerce engine seeded" });
}
