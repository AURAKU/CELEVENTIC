import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Lightweight health check for local dev and deployment probes */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("media") === "1";
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: Record<string, unknown> = {
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
    if (deep) {
      const { getMediaPipelineHealth } = await import("@/lib/media/media-health");
      body.media = await getMediaPipelineHealth();
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "degraded",
        timestamp: new Date().toISOString(),
        hint: "Database unreachable, run npm run db:push",
      },
      { status: 503 }
    );
  }
}
