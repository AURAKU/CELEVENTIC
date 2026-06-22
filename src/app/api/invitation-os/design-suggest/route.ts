import { NextResponse } from "next/server";
import { z } from "zod";
import { aiDesignAdvisorService } from "@/services/invitation-os/ai-design-advisor.service";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";

const schema = z.object({
  eventType: z.string(),
  guestCount: z.number().optional(),
  style: z.string().optional(),
  budgetGhs: z.number().optional(),
  colors: z.array(z.string()).optional(),
  templateSlug: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const suggestions = await aiDesignAdvisorService.suggest(body);

    if (body.templateSlug) {
      await invitationAnalyticsService.track({
        eventType: "TEMPLATE_VIEW",
        templateSlug: body.templateSlug,
      });
    }

    return NextResponse.json({ success: true, data: suggestions });
  } catch {
    return NextResponse.json({ error: "Suggestion failed" }, { status: 400 });
  }
}
