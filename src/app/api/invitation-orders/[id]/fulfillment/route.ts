import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Requirement collection for bespoke purchased extras (monogram,
 * illustration, custom domain, animated/voice intro). A paid extra is only a
 * feature flag until the customer's brief is captured — these endpoints give
 * every such extra a lifecycle: PENDING_INFO → SUBMITTED → IN_PROGRESS →
 * DELIVERED.
 */

const BRIEF_ADDON_SLUGS = new Set([
  "custom-monogram",
  "custom-illustration",
  "custom-domain",
  "video-intro",
  "voice-intro",
]);

async function getOwnedOrder(orderId: string, userId: string) {
  return prisma.invitationOrder.findFirst({
    where: { id: orderId, userId },
    select: { id: true, fulfilledAddons: true, addonSlugs: true },
  });
}

function briefableSlugs(order: { fulfilledAddons: unknown; addonSlugs: unknown }): string[] {
  const fulfilled = Array.isArray(order.fulfilledAddons) ? (order.fulfilledAddons as string[]) : [];
  const selected = Array.isArray(order.addonSlugs) ? (order.addonSlugs as string[]) : [];
  return [...new Set([...fulfilled, ...selected])].filter((slug) => BRIEF_ADDON_SLUGS.has(slug));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await getOwnedOrder(id, session.user.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ensure a request row exists for every purchased brief-requiring extra.
  const slugs = briefableSlugs(order);
  for (const addonSlug of slugs) {
    await prisma.addonFulfillmentRequest.upsert({
      where: { orderId_addonSlug: { orderId: id, addonSlug } },
      update: {},
      create: { orderId: id, addonSlug },
    });
  }

  const requests = await prisma.addonFulfillmentRequest.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: requests });
}

const submitSchema = z.object({
  addonSlug: z.string().min(1),
  brief: z.record(z.unknown()),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await getOwnedOrder(id, session.user.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = submitSchema.parse(await req.json());
    if (!briefableSlugs(order).includes(body.addonSlug)) {
      return NextResponse.json({ error: "This extra is not on your order" }, { status: 400 });
    }

    const request = await prisma.addonFulfillmentRequest.upsert({
      where: { orderId_addonSlug: { orderId: id, addonSlug: body.addonSlug } },
      update: { brief: body.brief as object, status: "SUBMITTED" },
      create: { orderId: id, addonSlug: body.addonSlug, brief: body.brief as object, status: "SUBMITTED" },
    });
    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save details" }, { status: 500 });
  }
}
