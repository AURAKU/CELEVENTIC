import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { onboardingService } from "@/services/workspace/onboarding.service";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(8),
    accountType: z.enum(["ORGANIZER", "EVENT_OWNER", "VENDOR", "ORGANIZATION"]).optional(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
    companyName: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    organizationName: z.string().optional(),
    vendorCategory: z.string().optional(),
    joinIntent: z.boolean().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Email or phone is required",
  })
  .refine(
    (data) => data.accountType !== "ORGANIZATION" || data.organizationName,
    { message: "Organization name is required", path: ["organizationName"] }
  );

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const passwordHash = await hashPassword(data.password);

    const result = await onboardingService.register({
      accountType: data.accountType ?? "ORGANIZER",
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      username: data.username,
      companyName: data.companyName,
      city: data.city,
      region: data.region,
      country: data.country,
      organizationName: data.organizationName,
      vendorCategory: data.vendorCategory,
      joinIntent: data.joinIntent,
    });

    return NextResponse.json(
      { success: true, data: result.user, redirect: result.redirect },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
