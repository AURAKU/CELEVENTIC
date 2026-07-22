import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const addons = await prisma.invitationAddon.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ success: true, data: addons });
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().default("general"),
  priceGhs: z.number().min(0),
  packageEligibility: z.array(z.string()).optional(),
  deliveryImpactDays: z.number().default(0),
  adminNotes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const slug = slugify(body.name);
    const addon = await prisma.invitationAddon.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        name: body.name,
        description: body.description,
        category: body.category,
        priceGhs: body.priceGhs,
        packageEligibility: body.packageEligibility,
        deliveryImpactDays: body.deliveryImpactDays,
        adminNotes: body.adminNotes,
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "InvitationAddon",
      entityId: addon.id,
      details: { operation: "COMMERCE_ADDON_CREATE", ...body },
    });
    return NextResponse.json({ success: true, data: addon }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

const updateSchema = createSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const { id, ...data } = body;
    const addon = await prisma.invitationAddon.update({ where: { id }, data });
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "InvitationAddon",
      entityId: id,
      details: { operation: "COMMERCE_ADDON_UPDATE", ...body },
    });
    return NextResponse.json({ success: true, data: addon });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
