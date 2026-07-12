import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessAdminPanel } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const adminViewMode = req.cookies.get("admin_view_mode")?.value;
    const role = token?.role as UserRole | undefined;

    if (path.startsWith("/auth") && token) {
      if (path.startsWith("/auth/onboarding/intent")) {
        return NextResponse.next();
      }
      const isVendorIncomplete =
        (token.accountType === "VENDOR" || role === "VENDOR") && !token.onboardingCompletedAt;
      const dest = isVendorIncomplete
        ? "/vendor/onboarding"
        : !token.onboardingCompletedAt && role !== "VENDOR" && token.accountType !== "VENDOR"
          ? "/dashboard/getting-started"
          : role && canAccessAdminPanel(role) && adminViewMode !== "user"
            ? "/admin"
            : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    if (path.startsWith("/admin")) {
      if (!role || !canAccessAdminPanel(role)) {
        return NextResponse.redirect(new URL("/dashboard?error=admin_forbidden", req.url));
      }
      if (adminViewMode === "user" || token?.isAdminView) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    const isVendor = token?.accountType === "VENDOR" || role === "VENDOR";
    const vendorOnboardingIncomplete = isVendor && !token?.onboardingCompletedAt;

    if (vendorOnboardingIncomplete && path.startsWith("/dashboard") && !path.startsWith("/dashboard/vendor-portal/signup")) {
      return NextResponse.redirect(new URL("/vendor/onboarding", req.url));
    }

    const generalOnboardingIncomplete =
      token &&
      !token.onboardingCompletedAt &&
      !isVendor &&
      path.startsWith("/dashboard") &&
      !path.startsWith("/dashboard/getting-started") &&
      !path.startsWith("/dashboard/help");

    if (generalOnboardingIncomplete) {
      return NextResponse.redirect(new URL("/dashboard/getting-started", req.url));
    }

    if (vendorOnboardingIncomplete && path === "/dashboard/vendor-portal") {
      return NextResponse.redirect(new URL("/vendor/onboarding", req.url));
    }

    if (!vendorOnboardingIncomplete && path.startsWith("/vendor/onboarding") && token) {
      return NextResponse.redirect(new URL("/dashboard/vendor-portal", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (
          path.startsWith("/dashboard") ||
          path.startsWith("/admin") ||
          path.startsWith("/vendor/onboarding")
        ) {
          return !!token && !token.invalid;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*", "/vendor/onboarding"],
};
