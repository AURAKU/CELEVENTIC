import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAuditLog } from "@/lib/audit";
import { isAdminRole } from "@/lib/auth";

export async function POST(req: Request) {
  const token = await getToken({ req: req as never, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id || !isAdminRole(token.role as never)) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  await createAuditLog({
    userId: token.id as string,
    action: "RETURN_TO_ADMIN",
    entity: "session",
    details: { from: "user_view", to: "admin" },
  });

  const response = NextResponse.redirect(new URL("/admin", req.url));
  response.cookies.delete("admin_view_mode");

  return response;
}
