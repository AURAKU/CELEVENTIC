import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { verifyAdminAccount } from "@/lib/auth/verify-admin-account";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const email = new URL(req.url).searchParams.get("email") ?? "admin@celeventic.com";
  const result = await verifyAdminAccount(email);
  return NextResponse.json({ success: true, data: result });
}
