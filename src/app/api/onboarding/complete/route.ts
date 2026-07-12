import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingService } from "@/services/workspace/onboarding.service";
import { z } from "zod";

const schema = z.object({
  skipped: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json().catch(() => ({})));
  void body.skipped;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true },
  });

  const accountType = user?.accountType ?? "ORGANIZER";
  await onboardingService.completeOnboarding(session.user.id, accountType);

  const redirect = accountType === "VENDOR" ? "/vendor/onboarding" : "/dashboard";

  return NextResponse.json({ success: true, redirect });
}
