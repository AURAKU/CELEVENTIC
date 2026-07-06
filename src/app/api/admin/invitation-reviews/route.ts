import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const reviews = await invitationAdminService.listReviews(status, page, limit);
  return NextResponse.json({ success: true, data: reviews });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  isVerified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = patchSchema.parse(await req.json());
    const { id, ...data } = body;
    const review = await invitationAdminService.updateReview(id, data);
    return NextResponse.json({ success: true, data: review });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
