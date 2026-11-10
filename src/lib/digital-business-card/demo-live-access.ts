import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";

/** Dummy live walkthroughs stay off the public site. Guests and cardholders never receive a live identity. */
export const CELECARD_DUMMY_LIVE_FALLBACK = "/digital-cards";

export function roleMayOpenDummyLive(role?: string | null): boolean {
  if (!role) return false;
  return canAccessAdminPanel(role as UserRole);
}

export async function viewerMayOpenDummyLive(): Promise<boolean> {
  const session = await getSession();
  return roleMayOpenDummyLive(session?.user?.role);
}

export async function dummyLiveNotFoundJson(): Promise<NextResponse | null> {
  if (await viewerMayOpenDummyLive()) return null;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function dummyLiveNotFoundResponse(): Promise<Response | null> {
  if (await viewerMayOpenDummyLive()) return null;
  return new Response("Not found", { status: 404 });
}
