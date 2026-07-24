import { registerJobHandler } from "@/lib/queue";
import { inspirationService } from "@/services/inspiration/inspiration.service";
import { communicationService } from "@/services/communications/communication.service";
import { processQueuedVideoAsset } from "@/lib/video/processing";

export function registerAllJobHandlers() {
  registerJobHandler("inspiration-analyze", async (payload) => {
    const uploadId = payload.uploadId as string;
    await inspirationService.analyze(uploadId);
  });

  registerJobHandler("campaign-send", async (payload) => {
    const campaignId = payload.campaignId as string;
    await communicationService.sendCampaign(campaignId);
  });

  // Kicks off (or resumes) MediaConvert processing for a video that just finished uploading.
  // This handler only *creates* the MediaConvert job — it never transcodes on the VPS itself.
  registerJobHandler("video-process", async (payload) => {
    const assetId = payload.assetId as string;
    await processQueuedVideoAsset(assetId);
  });
}
