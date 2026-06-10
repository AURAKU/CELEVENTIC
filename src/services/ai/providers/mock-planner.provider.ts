import type { AiPlannerProvider } from "@/services/ai/ai-provider.interface";
import { aiPlannerService } from "@/services/ai/planner.service";
import type { AIPlannerRequest, AIPlannerResponse } from "@/types";

export class MockPlannerProvider implements AiPlannerProvider {
  readonly name = "mock" as const;

  async generateEventPlan(request: AIPlannerRequest): Promise<AIPlannerResponse> {
    return aiPlannerService.generatePlan(request);
  }
}

export const mockPlannerProvider = new MockPlannerProvider();
