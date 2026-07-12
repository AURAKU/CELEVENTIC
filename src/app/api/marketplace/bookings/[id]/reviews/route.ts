import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceReviewService } from "@/services/marketplace/marketplace-review.service";
import { z } from "zod";

const schema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  serviceQuality: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  timeliness: z.number().min(1).max(5).optional(),
  wouldRecommend: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = schema.parse(await req.json());
    const review = await marketplaceReviewService.createVerifiedReview({
      bookingId: id,
      userId: session.user.id,
      ...body,
    });
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 400 }
    );
  }
}
