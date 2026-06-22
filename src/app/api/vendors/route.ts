import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vendorService } from "@/services/vendors/vendor.service";
import { verifyEventAccess } from "@/lib/event-access";

const createSchema = z.object({
  businessName: z.string().min(2),
  category: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
});

const bookingSchema = z.object({
  vendorId: z.string(),
  eventId: z.string().optional(),
  notes: z.string().optional(),
});

const reviewSchema = z.object({
  vendorId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const vendors = await vendorService.list({
    category: params.get("category") ?? undefined,
    location: params.get("location") ?? undefined,
    verified: params.get("verified") === "true",
  });
  return NextResponse.json({ success: true, data: vendors });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === "book") {
      const data = bookingSchema.parse(body);
      if (data.eventId) {
        await verifyEventAccess(data.eventId, session.user.id, session.user.role);
      }
      const booking = await vendorService.requestBooking(data.vendorId, session.user.id, data.eventId, data.notes);
      return NextResponse.json({ success: true, data: booking }, { status: 201 });
    }

    if (body.action === "review") {
      const data = reviewSchema.parse(body);
      const review = await vendorService.addReview(data.vendorId, session.user.id, data.rating, data.comment);
      return NextResponse.json({ success: true, data: review }, { status: 201 });
    }

    const data = createSchema.parse(body);
    const vendor = await vendorService.create({ ...data, userId: session.user.id });
    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Vendor operation failed" }, { status: 500 });
  }
}
