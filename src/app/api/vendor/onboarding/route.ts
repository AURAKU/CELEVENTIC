import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify, generateToken } from "@/lib/utils";

const onboardingSchema = z.object({
  step: z.number().int().min(1).max(10),
  businessName: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  services: z.array(z.object({ name: z.string(), description: z.string().optional(), priceFrom: z.number().optional() })).optional(),
  portfolio: z.array(z.object({ title: z.string(), imageUrl: z.string().optional() })).optional(),
  socialLinks: z.array(z.object({ platform: z.string(), url: z.string() })).optional(),
  complete: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id },
    include: { services: true, socialLinks: true, media: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true, onboardingCompletedAt: true },
  });

  const totalSteps = 10;
  const step = vendor?.onboardingStep ?? 0;
  const completed = !!vendor?.onboardingCompletedAt || !!user?.onboardingCompletedAt;

  return NextResponse.json({
    success: true,
    data: {
      vendor,
      step,
      totalSteps,
      completed,
      progress: Math.round((step / totalSteps) * 100),
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = onboardingSchema.parse(await req.json());
    let vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });

    if (!vendor && body.businessName && body.category) {
      vendor = await prisma.vendor.create({
        data: {
          userId: session.user.id,
          businessName: body.businessName,
          category: body.category,
          slug: `${slugify(body.businessName)}-${generateToken(4)}`,
          city: body.city,
          region: body.region,
          country: body.country ?? "Ghana",
          description: body.description,
          bio: body.bio,
          phone: body.phone,
          whatsapp: body.whatsapp,
          profileImage: body.profileImage,
          coverImage: body.coverImage,
          onboardingStep: body.step,
        },
      });
    } else if (vendor) {
      vendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          businessName: body.businessName ?? vendor.businessName,
          category: body.category ?? vendor.category,
          description: body.description ?? vendor.description,
          bio: body.bio ?? vendor.bio,
          city: body.city ?? vendor.city,
          region: body.region ?? vendor.region,
          country: body.country ?? vendor.country,
          phone: body.phone ?? vendor.phone,
          whatsapp: body.whatsapp ?? vendor.whatsapp,
          profileImage: body.profileImage ?? vendor.profileImage,
          coverImage: body.coverImage ?? vendor.coverImage,
          onboardingStep: Math.max(vendor.onboardingStep, body.step),
          onboardingCompletedAt: body.complete ? new Date() : vendor.onboardingCompletedAt,
        },
      });
    }

    if (body.services?.length && vendor) {
      await prisma.vendorService.deleteMany({ where: { vendorId: vendor.id } });
      await prisma.vendorService.createMany({
        data: body.services.map((s) => ({
          vendorId: vendor!.id,
          name: s.name,
          description: s.description,
          priceFrom: s.priceFrom ?? 0,
        })),
      });
    }

    if (body.socialLinks?.length && vendor) {
      await prisma.vendorSocialLink.deleteMany({ where: { vendorId: vendor.id } });
      await prisma.vendorSocialLink.createMany({
        data: body.socialLinks.map((s) => ({
          vendorId: vendor!.id,
          platform: s.platform,
          url: s.url,
        })),
      });
    }

    if (body.complete) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { onboardingCompletedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}
