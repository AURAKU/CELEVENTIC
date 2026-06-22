import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateRecommendationService } from "@/services/template-engine/template-recommendation.service";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const recommendations = await templateRecommendationService.recommend(body);
  return NextResponse.json({ success: true, data: recommendations });
}
