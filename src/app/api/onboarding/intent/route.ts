import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingService } from "@/services/workspace/onboarding.service";
import type { AccountType, UserRole } from "@prisma/client";
import { z } from "zod";

const ACCOUNT_ROLE_MAP: Record<AccountType, UserRole> = {
  ORGANIZER: "ORGANIZER",
  EVENT_OWNER: "ORGANIZER",
  VENDOR: "VENDOR",
  ORGANIZATION: "ORGANIZER",
};

const schema = z.object({
  accountType: z.enum(["ORGANIZER", "EVENT_OWNER", "VENDOR", "ORGANIZATION"]),
  joinIntent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const role = ACCOUNT_ROLE_MAP[body.accountType];

  await prisma.user.update({
    where: { id: session.user.id },
    data: { accountType: body.accountType, role },
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
    body.joinIntent
  );

  return NextResponse.json({ success: true, redirect });
}
