import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBuildFingerprint } from "@/lib/runtime/build-fingerprint";

/** Lightweight health check for local dev and deployment probes */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("media") === "1";
  // Reported on both branches: knowing *which build* is degraded is the whole
  // point of asking a sick server what it is.
  const build = getBuildFingerprint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: Record<string, unknown> = {
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      build,
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
        build,
        hint: "Database unreachable, run npm run db:push",
      },
      { status: 503 }
    );
  }
}
