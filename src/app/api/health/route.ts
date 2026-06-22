import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Lightweight health check for local dev and deployment probes */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "degraded",
        timestamp: new Date().toISOString(),
        hint: "Database unreachable — run npm run db:push",
      },
      { status: 503 }
    );
  }
}
