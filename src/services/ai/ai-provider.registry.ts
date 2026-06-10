import { prisma } from "@/lib/prisma";
import type { AiPlannerProvider, AiProviderName, AiProviderRegistry } from "@/services/ai/ai-provider.interface";
import { mockPlannerProvider } from "@/services/ai/providers/mock-planner.provider";
import { openAiPlannerProvider } from "@/services/ai/providers/openai-planner.provider";

const providers: Record<AiProviderName, AiPlannerProvider> = {
  mock: mockPlannerProvider,
  openai: openAiPlannerProvider,
  anthropic: mockPlannerProvider,
};

class PlannerProviderRegistry implements AiProviderRegistry {
  getProvider(name: AiProviderName = "mock"): AiPlannerProvider {
    return providers[name] ?? mockPlannerProvider;
  }

  async getActiveProvider(): Promise<AiPlannerProvider> {
    try {
      const setting = await prisma.adminSetting.findUnique({
        where: { key: "ai.planner_provider" },
      });
      const provider = (setting?.value as { provider?: AiProviderName })?.provider ?? "mock";
      return this.getProvider(provider);
    } catch {
      return mockPlannerProvider;
    }
  }
}

export const aiProviderRegistry = new PlannerProviderRegistry();
