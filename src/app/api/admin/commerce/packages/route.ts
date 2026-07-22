import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const packages = await prisma.invitationProductPackage.findMany({
    include: { prices: { where: { isActive: true }, take: 1 } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ success: true, data: packages });
}

const updateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  tagline: z.string().optional(),
  bestFor: z.string().optional(),
  priceGhs: z.number().optional(),
  revisions: z.number().optional(),
  deliveryDays: z.number().optional(),
  features: z.array(z.string()).optional(),
  designerAssist: z.boolean().optional(),
  paymentRequiredToPublish: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isBestValue: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const { id, priceGhs, ...rest } = body;

    const pkg = await prisma.invitationProductPackage.update({
      where: { id },
      data: {
        ...rest,
        ...(priceGhs !== undefined ? { priceGhs } : {}),
        ...(rest.features ? { features: rest.features } : {}),
        ...(rest.isPopular !== undefined ? { isPopular: rest.isPopular } : {}),
        ...(rest.isBestValue !== undefined ? { isBestValue: rest.isBestValue } : {}),
      },
    });

    if (priceGhs !== undefined) {
      await prisma.packagePrice.updateMany({
        where: { packageId: id, isActive: true },
        data: { amountGhs: priceGhs },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "InvitationProductPackage",
      entityId: id,
      details: { operation: "COMMERCE_PACKAGE_UPDATE", ...body },
    });

    return NextResponse.json({ success: true, data: pkg });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
