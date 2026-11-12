import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { digitalCardSocialsSchema } from "@/lib/digital-business-card/socials";
import { CELECARD_BIO_MAX_CHARS } from "@/lib/digital-business-card/types";
import {
  CeleCardAdminError,
  createAssistedCeleCard,
  listCeleCardAdminDirectory,
} from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  ownerUserId: z.string().min(1).nullable().optional(),
  unclaimedEmail: z.string().email().nullable().optional().or(z.literal("")),
  unclaimedPhone: z.string().max(40).nullable().optional(),
  displayName: z.string().min(2).max(80),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(CELECARD_BIO_MAX_CHARS).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  socials: digitalCardSocialsSchema.optional(),
  avatarUrl: z.string().max(800).nullable().optional(),
  themeId: z.string().max(80).nullable().optional(),
  connectBackEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  activation: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("draft") }),
    z.object({ kind: z.literal("payment") }),
    z.object({
      kind: z.enum(["complimentary", "promotional", "manual"]),
      planId: z.string().min(1),
      reason: z.string().min(8).max(500),
      months: z.number().int().min(1).max(36).optional(),
      approvalRef: z.string().max(120).nullable().optional(),
    }),
  ]),
});

export async function GET(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const data = await listCeleCardAdminDirectory({
    search: url.searchParams.get("search"),
    status: url.searchParams.get("status"),
    sort: url.searchParams.get("sort"),
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_CREATE);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const data = await createAssistedCeleCard(
      { id: session.user.id, role: session.user.role },
      {
        ...parsed.data,
        unclaimedEmail: parsed.data.unclaimedEmail || null,
        email: parsed.data.email || null,
      }
    );
    return NextResponse.json(
      { success: true, data, correlationId: randomUUID() },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[celecard.admin.create]", error);
    return NextResponse.json({ error: "Could not create CeleYou" }, { status: 500 });
  }
}
