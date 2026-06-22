import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const adminViewMode = req.cookies.get("admin_view_mode")?.value;

    if (path.startsWith("/auth") && token) {
      const adminRoles = ["SUPER_ADMIN", "ADMIN"];
      const dest =
        adminRoles.includes(token.role as string) && adminViewMode !== "user"
          ? "/admin"
          : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    if (path.startsWith("/admin")) {
      const adminRoles = ["SUPER_ADMIN", "ADMIN"];
      if (!token?.role || !adminRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (adminViewMode === "user" || token.isAdminView) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
