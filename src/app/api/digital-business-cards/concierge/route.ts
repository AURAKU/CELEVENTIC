import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CeleCardAdminError,
  createConciergeOrder,
  listConciergeOrders,
  quoteConciergeOrder,
} from "@/services/digital-business-card/concierge.service";

export const dynamic = "force-dynamic";

const intakeSchema = z.object({
  customerName: z.string().min(2).max(80),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).nullable().optional(),
  brief: z.string().min(12).max(2000),
  displayName: z.string().min(2).max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  themePreference: z.string().max(80).nullable().optional(),
  includeSubscription: z.boolean().optional(),
  planId: z.enum(["monthly", "quarter", "half", "yearly"]).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (new URL(req.url).searchParams.get("quote") === "1") {
    const include = new URL(req.url).searchParams.get("includeSubscription") === "1";
    const planId = new URL(req.url).searchParams.get("planId");
    const data = await quoteConciergeOrder({ includeSubscription: include, planId });
    return NextResponse.json({ success: true, data });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listConciergeOrders({
    customerUserId: session.user.id,
    page: new URL(req.url).searchParams.get("page"),
    limit: 20,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const parsed = intakeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const order = await createConciergeOrder({
      ...parsed.data,
      customerUserId: session?.user?.id || null,
      displayName: parsed.data.displayName || parsed.data.customerName,
    });
    return NextResponse.json({ success: true, data: { id: order.id, totalGhs: order.totalGhs, status: order.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[celecard.concierge.intake]", error);
    return NextResponse.json({ error: "Could not submit concierge request" }, { status: 500 });
  }
}
