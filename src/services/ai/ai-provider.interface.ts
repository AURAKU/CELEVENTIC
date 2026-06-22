import type { AIPlannerRequest, AIPlannerResponse } from "@/types";

export type AiProviderName = "mock" | "openai" | "anthropic";

export interface AiProviderConfig {
  provider: AiProviderName;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface AiPlannerProvider {
  readonly name: AiProviderName;
  generateEventPlan(request: AIPlannerRequest): Promise<AIPlannerResponse>;
}

export interface AiProviderRegistry {
  getProvider(name?: AiProviderName): AiPlannerProvider;
  getActiveProvider(): Promise<AiPlannerProvider>;
}
