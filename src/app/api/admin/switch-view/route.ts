import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAuditLog } from "@/lib/audit";
import { canSwitchAdminView } from "@/lib/admin-permissions";
import { resolveAppUrl } from "@/lib/app-url";
import type { UserRole } from "@prisma/client";

const VIEW_COOKIE = "admin_view_mode";

function publicOrigin(req: NextRequest): string {
  return resolveAppUrl({
    host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    protocol: req.headers.get("x-forwarded-proto") ?? undefined,
  });
}

/**
 * Enter organizer dashboard while keeping the admin session.
 * Sets admin_view_mode=user so /admin stays blocked until return-to-admin.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const origin = publicOrigin(req);

  if (!token?.id || !canSwitchAdminView(token.role as UserRole)) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  await createAuditLog({
    userId: token.id as string,
    action: "SWITCH_TO_USER_VIEW",
    entity: "session",
    details: { from: "admin", to: "user_view" },
  });

  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  const response = NextResponse.redirect(new URL("/dashboard", origin));
  response.cookies.set(VIEW_COOKIE, "user", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
