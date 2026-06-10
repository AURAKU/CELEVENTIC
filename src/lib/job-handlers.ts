import { registerJobHandler } from "@/lib/queue";
import { inspirationService } from "@/services/inspiration/inspiration.service";
import { communicationService } from "@/services/communications/communication.service";

export function registerAllJobHandlers() {
  registerJobHandler("inspiration-analyze", async (payload) => {
    const uploadId = payload.uploadId as string;
    await inspirationService.analyze(uploadId);
  });

  registerJobHandler("campaign-send", async (payload) => {
    const campaignId = payload.campaignId as string;
    await communicationService.sendCampaign(campaignId);
  });
}
