import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAuditLog } from "@/lib/audit";
import { canSwitchAdminView } from "@/lib/admin-permissions";
import type { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const token = await getToken({ req: req as never, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id || !canSwitchAdminView(token.role as UserRole)) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  await createAuditLog({
    userId: token.id as string,
    action: "SWITCH_TO_USER_VIEW",
    entity: "session",
    details: { from: "admin", to: "user_view" },
  });

  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("admin_view_mode", "user", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
