import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import { ALL_GUEST_FEATURE_KEYS, type GuestFeatureKey } from "@/lib/invitation-features/registry";
import { publishFeatureEvent } from "@/lib/invitation-features/events";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function authorize(invitationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, eventId: true, uniqueLink: true, featureConfig: true },
  });
  if (!invitation) return { error: NextResponse.json({ error: "Invitation not found" }, { status: 404 }) };
  try {
    await requireEventPermission(invitation.eventId, session.user.id, session.user.role, EventPermissionKey.EDIT_EVENT);
  } catch {
    return { error: NextResponse.json({ error: "You do not have permission to manage features" }, { status: 403 }) };
  }
  return { session, invitation };
}

/** Read the resolved (inherited) feature map for an invitation. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const features = await resolveInvitationFeatures(id);
  return NextResponse.json({ success: true, data: features });
}

const patchSchema = z.object({
  featureKey: z.enum(ALL_GUEST_FEATURE_KEYS as [GuestFeatureKey, ...GuestFeatureKey[]]),
  enabled: z.boolean().optional(),
  order: z.number().int().min(0).max(9999).optional(),
  config: z.record(z.unknown()).optional(),
  reason: z.string().trim().max(500).optional(),
});

/** Set (or clear) an invitation-level override for one feature. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const { session, invitation } = auth;

  const rl = await rateLimit(`inv-features:${session.user.id}:${clientIp(req)}`, 60, 60);
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let data: z.infer<typeof patchSchema>;
  try {
    data = patchSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const current = (invitation.featureConfig as Record<string, unknown> | null) ?? {};
  const before = current[data.featureKey] ?? null;
  const nextOverride: Record<string, unknown> = { ...(before as Record<string, unknown> | null) };
  if (data.enabled !== undefined) nextOverride.enabled = data.enabled;
  if (data.order !== undefined) nextOverride.order = data.order;
  if (data.config !== undefined) nextOverride.config = data.config;

  const nextConfig = { ...current, [data.featureKey]: nextOverride };

  await prisma.invitation.update({
    where: { id },
    data: { featureConfig: nextConfig as Prisma.InputJsonValue, lastMigratedAt: new Date() },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "invitation_feature",
    entityId: id,
    details: {
      featureKey: data.featureKey,
      before,
      after: nextOverride,
      reason: data.reason ?? null,
      eventId: invitation.eventId,
    },
  });

  publishFeatureEvent(
    data.enabled === false ? "INVITATION_FEATURE_DISABLED" : "INVITATION_FEATURE_ENABLED",
    { invitationId: id, invitationLink: invitation.uniqueLink, eventId: invitation.eventId, featureKey: data.featureKey, actorUserId: session.user.id }
  );

  const features = await resolveInvitationFeatures(id);
  return NextResponse.json({ success: true, data: features });
}
