import { NextResponse } from "next/server";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: INVITATION_TEMPLATE_PRESETS.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      preview: t.preview,
      config: t.config,
    })),
  });
}
