import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  buildCoverageReport,
  coverageGatePasses,
  CELEVENTIC_HELP_COVERAGE,
} from "@/lib/celeventic-guide/coverage-matrix";
import { PRIORITY_VIDEO_SLUGS } from "@/lib/celeventic-guide/types";
import { CELEVENTIC_GUIDE_CATALOG } from "@/lib/celeventic-guide/catalog";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = buildCoverageReport();
  const gate = coverageGatePasses(report);
  const videoRequired = CELEVENTIC_GUIDE_CATALOG.filter(
    (g) =>
      (PRIORITY_VIDEO_SLUGS as readonly string[]).includes(g.slug) ||
      (g.videoProductionRequired !== false && !g.videoUrl && !g.mp4Url)
  ).map((g) => ({
    slug: g.slug,
    title: g.title,
    priority: (PRIORITY_VIDEO_SLUGS as readonly string[]).includes(g.slug),
    targetMp4: `/guides/videos/${g.slug}.mp4`,
  }));

  return NextResponse.json({
    report,
    gate,
    matrixSize: CELEVENTIC_HELP_COVERAGE.length,
    catalogSize: CELEVENTIC_GUIDE_CATALOG.length,
    videoProductionRequired: videoRequired,
  });
}
