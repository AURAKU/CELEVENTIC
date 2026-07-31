import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(32)
    .nullable()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length === 0 ? null : cleaned;
    }),
  avatarUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      return value;
    }),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactor: { select: { isEnabled: true } },
    },
  });

  const org = await prisma.organization.findFirst({
    where: { users: { some: { id: session.user.id } } },
    select: { logoUrl: true, name: true, plan: true, slug: true, country: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            role: user.role,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            twoFactorEnabled: Boolean(user.twoFactor?.isEnabled),
          }
        : null,
      organizationLogo: org?.logoUrl ?? null,
      organizationName: org?.name ?? null,
      organization: org,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await req.json());

    if (body.phone) {
      const clash = await prisma.user.findFirst({
        where: { phone: body.phone, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "That phone number is already used on another account." },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
