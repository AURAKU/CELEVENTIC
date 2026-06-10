import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";

const signupSchema = z.object({
  businessName: z.string().min(2),
  vendorType: z.string().optional(),
  ownerName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  category: z.string(),
  categorySlugs: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
  yearsExperience: z.number().optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  socialLinks: z.array(z.object({ platform: z.string(), url: z.string().url() })).optional(),
});

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const vendor = await vendorProfileService.getBySlug(slug);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await vendorProfileService.trackEvent(vendor.id, "PROFILE_VIEW");
  return NextResponse.json({ success: true, data: vendor });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = signupSchema.parse(await req.json());
    const existing = await vendorProfileService.getByUserId(session.user.id);
    if (existing) return NextResponse.json({ error: "You already have a vendor profile" }, { status: 400 });
    const vendor = await vendorProfileService.signup({ ...body, userId: session.user.id });
    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Signup failed" }, { status: 500 });
  }
}
