import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventService } from "@/services/events/event.service";
import type { EventType } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventType = new URL(req.url).searchParams.get("eventType") as EventType | null;

  const [packages, themes] = await Promise.all([
    eventService.getPackages(),
    eventType ? eventService.getThemes(eventType) : eventService.getThemes(),
  ]);

  let blueprint = null;
  if (eventType) {
    const { getBlueprint } = await import("@/lib/blueprints");
    const bp = getBlueprint(eventType);
    blueprint = {
      label: bp.label,
      requiredFields: bp.requiredFields,
      terminology: bp.terminology,
      templateCategories: bp.templateCategories,
      vendorCategories: bp.vendorCategories,
      starterFeatures: bp.starterFeatures,
      premiumFeatures: bp.premiumFeatures,
      eliteFeatures: bp.eliteFeatures,
    };
  }

  return NextResponse.json({ success: true, data: { packages, themes, blueprint } });
}
