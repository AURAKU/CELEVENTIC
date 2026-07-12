import { NextResponse } from "next/server";
import { getBlueprint } from "@/lib/blueprints";
import type { EventType } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ eventType: string }> }) {
  const { eventType } = await params;
  const blueprint = getBlueprint(eventType as EventType);
  return NextResponse.json({
    success: true,
    data: {
      eventType: blueprint.eventType,
      label: blueprint.label,
      defaultModules: blueprint.defaultModules,
      optionalModules: blueprint.optionalModules,
      hiddenModules: blueprint.hiddenModules,
      templateCategories: blueprint.templateCategories,
      vendorCategories: blueprint.vendorCategories,
      terminology: blueprint.terminology,
      requiredFields: blueprint.requiredFields,
      starterFeatures: blueprint.starterFeatures,
      premiumFeatures: blueprint.premiumFeatures,
      eliteFeatures: blueprint.eliteFeatures,
    },
  });
}
