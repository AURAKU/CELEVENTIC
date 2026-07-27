import { registerJobHandler } from "@/lib/queue";
import { inspirationService } from "@/services/inspiration/inspiration.service";
import { communicationService } from "@/services/communications/communication.service";
import { processQueuedVideoAsset } from "@/lib/video/processing";
import {
  GENERAL_PASS_QUEUE,
  GUEST_IMPORT_DELIVERY_QUEUE,
  GUEST_IMPORT_QUEUE,
} from "@/services/guest-import/queues";

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

  // Bulk Guest Import. Each handler processes one bounded chunk and re-queues
  // itself while work remains, so a 5,000-name list never blocks the worker on
  // a single tick and a restart resumes exactly where it stopped.
  registerJobHandler(GUEST_IMPORT_QUEUE, async (payload) => {
    const { runGuestImportJob } = await import("@/services/guest-import/generation.service");
    await runGuestImportJob(payload.batchId as string);
  });

  registerJobHandler(GUEST_IMPORT_DELIVERY_QUEUE, async (payload) => {
    const { runDeliveryJob } = await import("@/services/guest-import/delivery.service");
    await runDeliveryJob(payload.batchId as string);
  });

  registerJobHandler(GENERAL_PASS_QUEUE, async (payload) => {
    const { runGeneralPassJob } = await import("@/services/guest-import/general-pass.service");
    await runGeneralPassJob(payload.batchId as string);
  });
}
