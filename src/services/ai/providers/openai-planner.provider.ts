import type { AiPlannerProvider } from "@/services/ai/ai-provider.interface";
import { mockPlannerProvider } from "@/services/ai/providers/mock-planner.provider";
import type { AIPlannerRequest, AIPlannerResponse } from "@/types";

/**
 * OpenAI provider — falls back to mock when API key is not configured.
 * Replace with real OpenAI chat completion in production.
 */
export class OpenAiPlannerProvider implements AiPlannerProvider {
  readonly name = "openai" as const;

  async generateEventPlan(request: AIPlannerRequest): Promise<AIPlannerResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return mockPlannerProvider.generateEventPlan(request);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Celeventic AI Event Planner. Return valid JSON matching the AIPlannerResponse schema for event planning in Ghana/Africa and globally.",
            },
            {
              role: "user",
              content: JSON.stringify(request),
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) return mockPlannerProvider.generateEventPlan(request);

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return mockPlannerProvider.generateEventPlan(request);

      return JSON.parse(content) as AIPlannerResponse;
    } catch {
      return mockPlannerProvider.generateEventPlan(request);
    }
  }
}

export const openAiPlannerProvider = new OpenAiPlannerProvider();
