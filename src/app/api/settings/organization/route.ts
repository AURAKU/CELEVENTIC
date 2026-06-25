import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let org = user.organization;
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: `${user.name}'s Workspace`,
        slug: slugify(`${user.name}-workspace-${user.id.slice(-6)}`),
        users: { connect: { id: user.id } },
      },
    });
  }

  return NextResponse.json({ success: true, data: org });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, name: true, id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let orgId = user.organizationId;
    if (!orgId) {
      const created = await prisma.organization.create({
        data: {
          name: body.name ?? `${user.name}'s Workspace`,
          slug: slugify(`${user.name}-workspace-${user.id.slice(-6)}`),
          country: body.country ?? "GH",
          users: { connect: { id: user.id } },
        },
      });
      orgId = created.id;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.country ? { country: body.country } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      },
    });

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
