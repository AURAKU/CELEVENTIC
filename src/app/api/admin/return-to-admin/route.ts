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

function clearAdminViewCookie(response: NextResponse) {
  // Must mirror the attributes used when setting, or production browsers keep the cookie.
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  response.cookies.set(VIEW_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Leave organizer “user view” and open the Admin Control Center.
 * Clears admin_view_mode so /admin is no longer redirected back to /dashboard.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const origin = publicOrigin(req);

  if (!token?.id || !canSwitchAdminView(token.role as UserRole)) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  await createAuditLog({
    userId: token.id as string,
    action: "RETURN_TO_ADMIN",
    entity: "session",
    details: { from: "user_view", to: "admin" },
  });

  const response = NextResponse.redirect(new URL("/admin", origin));
  clearAdminViewCookie(response);
  return response;
}
