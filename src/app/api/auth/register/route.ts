import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { onboardingService } from "@/services/workspace/onboarding.service";

function emptyToUndefined(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return typeof v === "string" ? v.trim() : v;
}

const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Username is required" })
      .trim()
      .min(2, "Username must be at least 2 characters"),
    email: z.preprocess(
      emptyToUndefined,
      z.string().email("Enter a valid email address").optional()
    ),
    phone: z.preprocess(
      emptyToUndefined,
      z.string().min(10, "Phone number looks too short").optional()
    ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    accountType: z.enum(["ORGANIZER", "EVENT_OWNER", "VENDOR", "ORGANIZATION"], {
      required_error: "Please choose what you'd like to do",
      invalid_type_error: "Please choose what you'd like to do",
    }),
    // Optional public handle — empty/short values are ignored (never block signup).
    username: z.preprocess(emptyToUndefined, z.string().optional()),
    companyName: z.preprocess(emptyToUndefined, z.string().optional()),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    region: z.preprocess(emptyToUndefined, z.string().optional()),
    country: z.preprocess(emptyToUndefined, z.string().optional()),
    organizationName: z.preprocess(emptyToUndefined, z.string().optional()),
    vendorCategory: z.preprocess(emptyToUndefined, z.string().optional()),
    joinIntent: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone is required",
        path: ["email"],
      });
    }

    if (data.accountType === "ORGANIZATION" && !data.organizationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required",
        path: ["organizationName"],
      });
    }

    const wantsPublicUsername =
      data.accountType === "ORGANIZER" || data.accountType === "ORGANIZATION";

    if (wantsPublicUsername && data.username) {
      if (data.username.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Public username must be at least 3 characters (or leave blank)",
          path: ["username"],
        });
      } else if (data.username.length > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Public username must be 30 characters or fewer",
          path: ["username"],
        });
      } else if (!/^[a-z0-9_]+$/.test(data.username)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Public username can only use lowercase letters, numbers, and underscores",
          path: ["username"],
        });
      }
    }
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const passwordHash = await hashPassword(data.password);

    const wantsPublicUsername =
      data.accountType === "ORGANIZER" || data.accountType === "ORGANIZATION";
    const username =
      wantsPublicUsername && data.username && data.username.length >= 3
        ? data.username.toLowerCase()
        : undefined;

    const result = await onboardingService.register({
      accountType: data.accountType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      username,
      companyName: data.companyName,
      city: data.city,
      region: data.region,
      country: data.country,
      organizationName: data.organizationName,
      vendorCategory:
        data.accountType === "VENDOR" ? data.vendorCategory : undefined,
      joinIntent: data.joinIntent,
    });

    return NextResponse.json(
      { success: true, data: result.user, redirect: result.redirect },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || "Please check your details and try again";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
