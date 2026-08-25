import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingService } from "@/services/workspace/onboarding.service";
import { generateToken, slugify } from "@/lib/utils";
import type { AccountType, UserRole } from "@prisma/client";
import { z } from "zod";

const ACCOUNT_ROLE_MAP: Record<AccountType, UserRole> = {
  ORGANIZER: "ORGANIZER",
  EVENT_OWNER: "ORGANIZER",
  VENDOR: "VENDOR",
  ORGANIZATION: "ORGANIZER",
};

const schema = z
  .object({
    accountType: z.enum(["ORGANIZER", "EVENT_OWNER", "VENDOR", "ORGANIZATION"]),
    joinIntent: z.boolean().optional(),
    organizationName: z.string().trim().min(2).optional(),
    vendorCategory: z.string().trim().optional(),
  })
  .refine(
    (data) => data.accountType !== "ORGANIZATION" || Boolean(data.organizationName),
    { message: "Organization name is required", path: ["organizationName"] }
  );

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const role = ACCOUNT_ROLE_MAP[body.accountType];
  let organizationId: string | undefined;

  if (body.accountType === "ORGANIZATION" && body.organizationName) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, role: "OWNER" },
      select: { organizationId: true },
    });
    if (existingMember) {
      organizationId = existingMember.organizationId;
      await prisma.organization.update({
        where: { id: organizationId },
        data: { name: body.organizationName },
      });
    } else {
      const org = await prisma.organization.create({
        data: {
          name: body.organizationName,
          slug: `${slugify(body.organizationName)}-${generateToken(4)}`,
          country: "GH",
        },
      });
      organizationId = org.id;
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      accountType: body.accountType,
      role,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  if (body.accountType === "ORGANIZER" || body.accountType === "ORGANIZATION") {
    const existing = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, username: true },
      });
      const slug = user?.username ?? `user-${session.user.id.slice(0, 8)}`;
      await prisma.organizerProfile.create({
        data: {
          userId: session.user.id,
          slug,
          country: "GH",
          isPublic: true,
        },
      });
    }
  }

  const redirect = onboardingService.getPostSignupRedirect(
    body.accountType,
    null,
    body.joinIntent,
    { vendorCategory: body.vendorCategory }
  );

  return NextResponse.json({ success: true, redirect });
}
